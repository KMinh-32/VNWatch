# HỌC VNWATCH — outputs/vnwatch-agent/main.py
# Tạo dịch vụ FastAPI nội bộ: xác thực gateway bằng service token, giới hạn bốn lượt đồng thời và chọn OpenAI/catalog.
# import nạp dependency; async/await chờ I/O mà không chặn toàn bộ event loop.
import asyncio
import os
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Response
from openai import AsyncOpenAI
from contracts import ChatRequest, ChatReply
from consultant import consult

load_dotenv(Path(__file__).with_name(".env"))


# Tạo FastAPI với token nội bộ, provider tùy cấu hình và semaphore giới hạn tải.
def create_app(token: str | None = None, client=None, model: str | None = None) -> FastAPI:
    service_token = token if token is not None else os.getenv("ASSISTANT_SERVICE_TOKEN", "")
    model_name = model or os.getenv("OPENAI_MODEL", "gpt-5.4-mini")
    key = os.getenv("OPENAI_API_KEY", "").strip()
    provider = client or (AsyncOpenAI(api_key=key, timeout=8, max_retries=0) if key else None)
    # Bốn slot giới hạn số lượt tư vấn đang xử lý; request quá tải nhận 503 nhanh.
    slots = asyncio.Semaphore(4)

    @asynccontextmanager
    # Kiểm tra token khi bắt đầu, sau yield đóng client do app tự tạo khi dừng.
    async def lifespan(app):
        if len(service_token) < 32:
            raise RuntimeError("Configure ASSISTANT_SERVICE_TOKEN with at least 32 characters.")
        yield
        if provider and client is None:
            await provider.close()

    app = FastAPI(title="VNWatch customer consultant", version="0.1.0", lifespan=lifespan,
                  docs_url=None, redoc_url=None, openapi_url=None)

    # Đặc tả dùng giữa các dịch vụ, xác thực bằng cùng token như API tư vấn.
    @app.get("/internal/openapi.json", include_in_schema=False)
    async def contract(x_agent_token: str = Header(default="")):
        if len(service_token) < 32 or not secrets.compare_digest(x_agent_token, service_token):
            raise HTTPException(status_code=401, detail="Unauthorized gateway")
        return app.openapi()

    # Decorator đăng ký endpoint; FastAPI dùng annotation/Pydantic kiểm tra request và response.
    @app.get("/health")
    # Trả health và chế độ OPENAI/CATALOG, không lộ key.
    async def health():
        return {"status": "ok", "mode": "OPENAI" if provider else "CATALOG"}

    # Decorator đăng ký endpoint; FastAPI dùng annotation/Pydantic kiểm tra request và response.
    @app.post("/internal/chat", response_model=ChatReply)
    # So sánh service token, xin slot có hạn chờ, gọi consult và luôn trả slot trong finally.
    async def chat(body: ChatRequest, response: Response, x_agent_token: str = Header(default="")):
        # So sánh token hằng thời gian; chỉ NestJS gateway biết token nội bộ mới gọi được chat.
        if len(service_token) < 32 or not secrets.compare_digest(x_agent_token, service_token):
            raise HTTPException(status_code=401, detail="Unauthorized gateway")
        response.headers["Cache-Control"] = "no-store"
        try:
            await asyncio.wait_for(slots.acquire(), timeout=0.1)
        except TimeoutError:
            raise HTTPException(status_code=503, detail="Consultant busy")
        try:
            return await consult(body, provider, model_name)
        # Dù consult thành công hay lỗi vẫn trả slot; nếu quên release, dịch vụ sẽ dần hết lượt xử lý.
        finally:
            slots.release()

    return app


app = create_app()
