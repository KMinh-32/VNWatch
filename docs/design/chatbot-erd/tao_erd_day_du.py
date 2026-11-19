"""Dựng ERD gộp từ cấu trúc bảng; xuất SVG, Mermaid và draw.io."""
from pathlib import Path
from html import escape
from math import hypot
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
STEM = "VNWatch-ERD-day-du"
WIDTH, HEIGHT = 3270, 1930
TABLES = []

def table(name, x, y, rows, kind="GỐC"):
    color = {"GỐC": "#dae8fc", "MỚI": "#d5e8d4", "CẬP NHẬT": "#ffe6cc"}[kind]
    obj = dict(id=name, x=x, y=y, w=430, h=64+28*len(rows), rows=rows, kind=kind, color=color)
    TABLES.append(obj)
    return obj

table("danhmuc", 70, 180, [
    ("PK", "MaDM", "INT"), ("", "TenDM", "VARCHAR(100)"), ("FK", "MaDMCha", "INT NULL"),
    ("", "ThuTuHienThi", "INT"), ("", "MoTa", "VARCHAR(255)")])
table("sanpham", 610, 180, [
    ("PK", "MaSP", "VARCHAR(20)"), ("", "TenSP", "VARCHAR(200)"), ("", "ThuongHieu", "VARCHAR(100)"),
    ("FK", "MaDM", "INT"), ("", "KieuMay", "VARCHAR(50)"), ("", "ChatLieuDay", "VARCHAR(50)"),
    ("", "GiaGoc", "DECIMAL(15,0)"), ("", "GiaBan", "DECIMAL(15,0)"), ("", "SoLuongTon", "INT"),
    ("", "HinhAnh", "VARCHAR(255)"), ("", "ThongSoChiTiet", "JSON"), ("", "TrangThai", "VARCHAR(20)")])
table("donhang", 1150, 180, [
    ("PK", "MaDH", "VARCHAR(20)"), ("FK", "MaTK", "INT"), ("", "HoTenNhan", "VARCHAR(100)"),
    ("", "SoDienThoaiNhan", "VARCHAR(15)"), ("", "DiaChiNhan", "VARCHAR(255)"), ("", "GhiChu", "VARCHAR(255)"),
    ("FK", "MaCode", "VARCHAR(30) NULL"), ("", "TamTinh", "DECIMAL(15,0)"), ("", "TienGiam", "DECIMAL(15,0)"),
    ("", "TongThanhToan", "DECIMAL(15,0)"), ("", "TrangThai", "VARCHAR(20)"), ("", "NgayDat", "DATETIME"),
    ("FK", "MaNguoiXuLy", "INT NULL"), ("", "NgayCapNhat", "DATETIME")])
table("magiamgia", 1690, 180, [
    ("PK", "MaCode", "VARCHAR(30)"), ("", "LoaiGiam", "VARCHAR(10)"), ("", "GiaTriGiam", "DECIMAL(15,2)"),
    ("", "GiaTriToiThieu", "DECIMAL(15,0)"), ("", "NgayBatDau", "DATETIME"), ("", "NgayHetHan", "DATETIME"),
    ("", "SoLuotToiDa", "INT"), ("", "SoLuotDaDung", "INT"), ("", "TrangThai", "VARCHAR(20)")])
table("taikhoan", 2230, 180, [
    ("PK", "MaTK", "INT"), ("", "HoTen", "VARCHAR(100)"), ("", "Email", "VARCHAR(100)"),
    ("", "SoDienThoai", "VARCHAR(15)"), ("", "MatKhauHash", "VARCHAR(255)"), ("", "DiaChiMacDinh", "VARCHAR(255)"),
    ("", "VaiTro", "VARCHAR(20)"), ("", "NhomKhachHang", "VARCHAR(20)"), ("", "TongChiTieu", "DECIMAL(15,0)"),
    ("", "TrangThai", "VARCHAR(20)"), ("", "SoLanSaiLienTiep", "INT"), ("", "KhoaDen", "DATETIME"),
    ("", "NhaCungCapOAuth", "VARCHAR(20)"), ("", "OAuthId", "VARCHAR(100)"), ("", "NgayTao", "DATETIME")])
table("phienchat", 2770, 180, [
    ("PK", "MaPhien", "VARCHAR(36)"), ("FK", "MaTK", "INT NULL"), ("", "TieuDe", "VARCHAR(150) NULL"),
    ("", "TrangThai", "VARCHAR(20)"), ("", "NgayTao", "DATETIME"), ("", "NgayCapNhat", "DATETIME")], "MỚI")

table("hinhanhsanpham", 70, 830, [
    ("PK", "MaHA", "INT"), ("FK", "MaSP", "VARCHAR(20)"), ("", "DuongDan", "VARCHAR(255)"),
    ("", "ThuTu", "INT"), ("", "DacTrungAnh", "JSON")])
table("giohang", 610, 830, [
    ("PK,FK", "MaTK", "INT"), ("PK,FK", "MaSP", "VARCHAR(20)"), ("", "SoLuong", "INT"), ("", "NgayCapNhat", "DATETIME")])
table("chitietdonhang", 1150, 830, [
    ("PK,FK", "MaDH", "VARCHAR(20)"), ("PK,FK", "MaSP", "VARCHAR(20)"), ("", "SoLuong", "INT"),
    ("", "DonGia", "DECIMAL(15,0)"), ("", "ThanhTien", "DECIMAL(15,0)")])
table("thanhtoan", 1690, 830, [
    ("PK", "MaTT", "INT"), ("FK", "MaDH", "VARCHAR(20)"), ("", "PhuongThuc", "VARCHAR(10)"),
    ("", "SoTien", "DECIMAL(15,0)"), ("", "TrangThai", "VARCHAR(20)"), ("", "MaGiaoDich", "VARCHAR(100)"),
    ("", "ThoiGianThanhToan", "DATETIME"), ("", "NgayTao", "DATETIME")])
table("tinnhanchat", 2230, 830, [
    ("PK", "MaTN", "INT"), ("FK", "MaPhien", "VARCHAR(36)"), ("FK", "MaTK", "INT NULL"),
    ("", "NguoiGui", "VARCHAR(15)"), ("", "NoiDung", "TEXT"), ("", "YDinh", "VARCHAR(30) NULL"),
    ("+", "CheDo", "VARCHAR(20) NULL"), ("+", "TenMoHinh", "VARCHAR(100) NULL"),
    ("+", "TrangThai", "VARCHAR(20)"), ("", "ThoiGian", "DATETIME")], "CẬP NHẬT")
table("kienthucchatbot", 2770, 830, [
    ("PK", "MaKT", "INT"), ("", "Loai", "VARCHAR(30)"), ("", "ChuDe", "VARCHAR(100)"),
    ("", "TieuDe", "VARCHAR(200)"), ("", "NoiDung", "TEXT"), ("", "URLNguon", "VARCHAR(1000) NULL"),
    ("", "TrangThai", "VARCHAR(20)"), ("FK", "NguoiDuyet", "INT NULL"),
    ("", "NgayDuyet", "DATETIME NULL"), ("", "NgayCapNhat", "DATETIME")], "MỚI")

table("danhgiasanpham", 70, 1420, [
    ("PK", "MaDG", "INT"), ("FK", "MaTK", "INT"), ("FK", "MaSP", "VARCHAR(20)"),
    ("", "SoSao", "TINYINT"), ("", "NoiDung", "TEXT"), ("", "NgayTao", "DATETIME"), ("", "TrangThai", "VARCHAR(20)")])
table("baohanh", 610, 1420, [
    ("PK", "MaBH", "INT"), ("", "MaPhieu", "VARCHAR(20)"), ("FK", "MaDH", "VARCHAR(20)"),
    ("FK", "MaSP", "VARCHAR(20)"), ("", "SoThuTu", "SMALLINT"), ("", "SoSeri", "VARCHAR(50)"),
    ("", "NgayBatDau", "DATE"), ("", "NgayHetHan", "DATE"), ("", "TrangThai", "VARCHAR(20)"),
    ("", "GhiChu", "VARCHAR(255)"), ("", "NgayTao", "DATETIME")])
table("lichsudonhang", 1150, 1420, [
    ("PK", "MaLS", "INT"), ("FK", "MaDH", "VARCHAR(20)"), ("", "TrangThaiCu", "VARCHAR(20)"),
    ("", "TrangThaiMoi", "VARCHAR(20)"), ("FK", "MaTKXuLy", "INT NULL"), ("", "ThoiGian", "DATETIME"),
    ("", "GhiChu", "VARCHAR(255)")])
table("sanphamgoiy", 2230, 1420, [
    ("PK,FK", "MaTN", "INT"), ("PK,FK", "MaSP", "VARCHAR(20)"), ("", "ThuTu", "INT > 0"),
    ("", "LyDo", "VARCHAR(255) NULL")], "MỚI")
table("nguontraloi", 2770, 1420, [
    ("PK", "MaNguon", "INT"), ("FK", "MaTN", "INT"), ("FK", "MaKT", "INT NULL"),
    ("", "TieuDeNguon", "VARCHAR(200)"), ("", "URLNguon", "VARCHAR(1000) NULL"),
    ("", "NoiDungTrichDan", "TEXT NULL"), ("", "ThoiDiemSuDung", "DATETIME")], "MỚI")

BY_ID = {t["id"]: t for t in TABLES}
EDGES = []
def rel(source, target, fields, label, points, lx, ly, optional=False):
    """Mỗi quan hệ có mã để đọc được đường nối dài trên sơ đồ lớn."""
    EDGES.append(dict(id=f"R{len(EDGES)+1:02}", source=source, target=target, fields=fields,
                      label=label, points=points, lx=lx, ly=ly, start="0..1" if optional else "1", end="0..N"))

rel("danhmuc", "danhmuc", ["MaDMCha"], "Danh mục cha", [(70,255),(30,255),(30,335),(70,335)], 143, 418, True)
rel("danhmuc", "sanpham", ["MaDM"], "Danh mục", [(500,270),(610,270)], 555, 250)
rel("sanpham", "hinhanhsanpham", ["MaSP"], "Hình ảnh", [(610,400),(570,400),(570,935),(500,935)], 549, 655)
rel("sanpham", "danhgiasanpham", ["MaSP"], "Đánh giá SP", [(610,480),(535,480),(535,1550),(500,1550)], 550, 1250)
rel("sanpham", "giohang", ["MaSP"], "Sản phẩm", [(825,580),(825,830)], 825, 774)
rel("sanpham", "chitietdonhang", ["MaSP"], "Mặt hàng", [(1040,450),(1080,450),(1080,945),(1150,945)], 1095, 690)
rel("donhang", "chitietdonhang", ["MaDH"], "Chi tiết", [(1365,636),(1365,830)], 1365, 790)
rel("chitietdonhang", "baohanh", ["MaDH","MaSP"], "Bảo hành (khóa ghép)", [(1150,1000),(1110,1000),(1110,1300),(825,1300),(825,1420)], 960, 1281)
rel("magiamgia", "donhang", ["MaCode"], "Áp dụng mã", [(1690,310),(1580,310)], 1635, 287, True)
rel("donhang", "thanhtoan", ["MaDH"], "Thanh toán", [(1580,530),(1630,530),(1630,950),(1690,950)], 1629, 750)
rel("donhang", "lichsudonhang", ["MaDH"], "Lịch sử", [(1580,595),(1660,595),(1660,1360),(1365,1360),(1365,1420)], 1400, 1385)
rel("taikhoan", "donhang", ["MaTK"], "Người đặt", [(2230,580),(2185,580),(2185,690),(1605,690),(1605,560),(1580,560)], 1900, 675)
rel("taikhoan", "donhang", ["MaNguoiXuLy"], "Người xử lý", [(2445,180),(2445,130),(1365,130),(1365,180)], 1910, 116, True)
rel("taikhoan", "giohang", ["MaTK"], "Giỏ của khách", [(2335,664),(2335,735),(900,735),(900,830)], 1840, 732)
rel("taikhoan", "danhgiasanpham", ["MaTK"], "Khách đánh giá", [(2230,630),(2205,630),(2205,710),(15,710),(15,1510),(70,1510)], 152, 692)
rel("taikhoan", "lichsudonhang", ["MaTKXuLy"], "Nhân viên xử lý", [(2550,664),(2550,760),(2165,760),(2165,1330),(1520,1330),(1520,1420)], 1900, 1310, True)
rel("taikhoan", "phienchat", ["MaTK"], "Chủ phiên", [(2660,290),(2770,290)], 2715, 270, True)
rel("taikhoan", "tinnhanchat", ["MaTK"], "Người gửi", [(2445,664),(2445,830)], 2445, 794, True)
rel("phienchat", "tinnhanchat", ["MaPhien"], "Thuộc phiên", [(2985,412),(2985,650),(2705,650),(2705,970),(2660,970)], 2820, 632)
rel("taikhoan", "kienthucchatbot", ["NguoiDuyet"], "Admin duyệt", [(2660,550),(2735,550),(2735,1100),(2770,1100)], 2730, 778, True)
rel("tinnhanchat", "sanphamgoiy", ["MaTN"], "Gợi ý", [(2445,1174),(2445,1420)], 2445, 1350)
rel("sanpham", "sanphamgoiy", ["MaSP"], "Sản phẩm được gợi ý", [(1040,540),(1060,540),(1060,1820),(2110,1820),(2110,1510),(2230,1510)], 1740, 1802)
rel("tinnhanchat", "nguontraloi", ["MaTN"], "Nguồn câu trả lời", [(2660,1090),(2685,1090),(2685,1300),(2870,1300),(2870,1420)], 2790, 1281)
rel("kienthucchatbot", "nguontraloi", ["MaKT"], "Kiến thức tham chiếu", [(3030,1174),(3030,1420)], 3030, 1370, True)

# Kiểm tra đầy đủ FK và chặn đường nối đi xuyên qua nội dung bảng khác.
declared = {(t["id"], name) for t in TABLES for key,name,dtype in t["rows"] if "FK" in key}
connected = {(e["target"], field) for e in EDGES for field in e["fields"]}
assert declared == connected, (declared-connected, connected-declared)
assert len(TABLES) == 17 and len(EDGES) == 24
for edge in EDGES:
    for a,b in zip(edge["points"], edge["points"][1:]):
        assert a[0] == b[0] or a[1] == b[1], edge["id"]
        for t in TABLES:
            if a[0] == b[0]:
                crossing = t["x"] < a[0] < t["x"]+t["w"] and max(min(a[1],b[1]),t["y"]) < min(max(a[1],b[1]),t["y"]+t["h"])
            else:
                crossing = t["y"] < a[1] < t["y"]+t["h"] and max(min(a[0],b[0]),t["x"]) < min(max(a[0],b[0]),t["x"]+t["w"])
            assert not crossing, f'{edge["id"]} crosses {t["id"]}: {a} -> {b}'

def text(x,y,value,size=14,weight=400,fill="#1e293b",anchor="start"):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{escape(value)}</text>'

def marker(point,toward,value,color):
    dx,dy=toward[0]-point[0],toward[1]-point[1]
    length=hypot(dx,dy); ux,uy=dx/length,dy/length; nx,ny=-uy,ux
    def at(d,n=0): return point[0]+ux*d+nx*n,point[1]+uy*d+ny*n
    def line(a,b): return f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="{color}" stroke-width="1.7"/>'
    parts=[]
    if value.endswith("N"):
        parts.extend(line(at(1,n),at(15)) for n in (-7,0,7))
    else: parts.append(line(at(9,-7),at(9,7)))
    if value.startswith("0"):
        x,y=at(24); parts.append(f'<circle cx="{x}" cy="{y}" r="4" fill="white" stroke="{color}" stroke-width="1.6"/>')
    else: parts.append(line(at(19,-7),at(19,7)))
    return "".join(parts)

svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title desc">',
     '<title id="title">VNWatch - ERD đầy đủ: bán hàng và chatbot AI</title>',
     '<desc id="desc">17 bảng và 24 quan hệ. Gộp 13 bảng ERD gốc với 4 bảng chatbot AI; cập nhật tinnhanchat.</desc>',
     f'<rect width="{WIDTH}" height="{HEIGHT}" fill="#f8fafc"/>','<g font-family="Segoe UI, Arial, sans-serif">',
     text(70,49,"VNWATCH · ERD ĐẦY ĐỦ — BÁN HÀNG VÀ CHATBOT AI",32,700),
     text(70,84,"17 bảng · 24 quan hệ · 13 bảng từ ERD gốc + 4 bảng chatbot mới · tinnhanchat được cập nhật",17,fill="#475569")]

for edge in EDGES:
    color="#16806a" if int(edge["id"][1:])>=17 and edge["id"]!="R18" else "#64748b"
    edge["color"]=color
    pts=" ".join(f"{x},{y}" for x,y in edge["points"])
    svg.append(f'<polyline points="{pts}" fill="none" stroke="#f8fafc" stroke-width="6" stroke-linejoin="round"/>')
    svg.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="1.7" stroke-linejoin="round"/>')
    svg.append(marker(edge["points"][0],edge["points"][1],edge["start"],color))
    svg.append(marker(edge["points"][-1],edge["points"][-2],edge["end"],color))

# Vẽ nhãn sau toàn bộ đường nối để các đường giao nhau không che chữ.
for edge in EDGES:
    caption=edge["id"]+" · "+edge["label"]
    label_w=len(caption)*7.3+16
    svg.append(f'<rect x="{edge["lx"]-label_w/2}" y="{edge["ly"]-16}" width="{label_w}" height="23" rx="4" fill="#f8fafc"/>')
    svg.append(text(edge["lx"],edge["ly"],caption,12,fill=edge["color"],anchor="middle"))

for t in TABLES:
    x,y,w,h=(t[k] for k in ("x","y","w","h"))
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="white" stroke="#94a3b8"/>')
    svg.append(f'<path d="M{x+7},{y} H{x+w-7} Q{x+w},{y} {x+w},{y+7} V{y+57} H{x} V{y+7} Q{x},{y} {x+7},{y} Z" fill="{t["color"]}"/>')
    svg.append(text(x+14,y+24,t["id"],20,700))
    svg.append(text(x+14,y+44,t["kind"],11,600,"#475569"))
    for i,(key,name,dtype) in enumerate(t["rows"]):
        row_y=y+79+i*28
        if i: svg.append(f'<line x1="{x+1}" y1="{row_y-19}" x2="{x+w-1}" y2="{row_y-19}" stroke="#edf2f7"/>')
        svg.append(text(x+10,row_y,key,10,700,"#9a6700" if "PK" in key else "#0f766e"))
        svg.append(text(x+57,row_y,name,14,600 if "PK" in key else 400))
        svg.append(text(x+w-12,row_y,dtype,12,fill="#64748b",anchor="end"))

svg.extend([text(1710,1455,"CHÚ GIẢI",19,700),
    text(1710,1490,"Xanh dương: bảng gốc",14),text(1710,1517,"Xanh lá: bảng chatbot mới",14),text(1710,1544,"Cam: tinnhanchat đã cập nhật",14),
    text(1710,1584,"PK: khóa chính · FK: khóa ngoại",14),text(1710,1611,"+: trường thêm vào bảng cũ",14),
    text(1710,1638,"Chân quạ: nhiều · vòng tròn: tùy chọn",14),
    text(1710,1678,"R01–R24: mã nhận diện quan hệ",14),
    text(70,1858,"Bản gộp thiết kế từ ERD được cung cấp; đủ trường của các bảng gốc và phần chatbot. Không phải xác nhận schema database đang chạy.",15,fill="#475569"),
    text(70,1887,"Một số độ dài kiểu dữ liệu bị cắt trong ảnh gốc được hoàn thiện nhất quán. DATETIME theo hình gốc; PostgreSQL triển khai bằng TIMESTAMPTZ, mã phiên bằng UUID.",14,fill="#64748b"),
    '</g></svg>'])
(ROOT/f"{STEM}.svg").write_text("\n".join(svg),encoding="utf-8")

# Các bảng và connector trong draw.io có ID và cổng nối thật để di chuyển cùng nhau.
mxfile=ET.Element("mxfile",host="app.diagrams.net",type="device")
diagram=ET.SubElement(mxfile,"diagram",id="vnwatch-full-erd",name="VNWatch ERD đầy đủ")
model=ET.SubElement(diagram,"mxGraphModel",dx=str(WIDTH),dy=str(HEIGHT),grid="1",gridSize="10",page="1",pageWidth=str(WIDTH),pageHeight=str(HEIGHT),pageScale="1")
root=ET.SubElement(model,"root")
ET.SubElement(root,"mxCell",id="0"); ET.SubElement(root,"mxCell",id="1",parent="0")
def cell(identifier,value,style,x,y,w,h,parent="1"):
    node=ET.SubElement(root,"mxCell",id=identifier,value=value,style=style,vertex="1",parent=parent)
    ET.SubElement(node,"mxGeometry",x=str(x),y=str(y),width=str(w),height=str(h),**{"as":"geometry"})
    return node
cell("title","VNWATCH · ERD ĐẦY ĐỦ — BÁN HÀNG VÀ CHATBOT AI","text;html=0;align=left;fontSize=32;fontStyle=1;",70,15,3050,42)
cell("subtitle","17 bảng · 24 quan hệ · 13 bảng gốc + 4 bảng mới; tinnhanchat được cập nhật","text;html=0;align=left;fontSize=17;",70,60,3050,30)
for t in TABLES:
    cell(t["id"],"",'rounded=1;html=0;fillColor=#ffffff;strokeColor=#94a3b8;container=1;collapsible=0;',t["x"],t["y"],t["w"],t["h"])
    header=escape(t["id"])+f'<br><span style="font-size:11px">{escape(t["kind"])}</span>'
    cell(t["id"]+"_header",header,f'text;html=1;align=left;spacingLeft=14;fontSize=20;fontStyle=1;fillColor={t["color"]};strokeColor=none;',0,0,t["w"],57,t["id"])
    rows=[]
    for key,name,dtype in t["rows"]:
        rows.append(f'<tr><td width="42" style="color:#0f766e;font-size:10px">{escape(key)}</td><td>{escape(name)}</td><td align="right" style="color:#64748b;font-size:12px">{escape(dtype)}</td></tr>')
    body='<table style="width:100%;border-collapse:collapse;font-size:14px;line-height:28px">'+"".join(rows)+'</table>'
    cell(t["id"]+"_rows",body,'text;html=1;align=left;verticalAlign=top;spacing=6;overflow=fill;',0,57,t["w"],t["h"]-57,t["id"])
for e in EDGES:
    a,b=e["points"][0],e["points"][-1]; s,t=BY_ID[e["source"]],BY_ID[e["target"]]
    exit_x,exit_y=(a[0]-s["x"])/s["w"],(a[1]-s["y"])/s["h"]
    entry_x,entry_y=(b[0]-t["x"])/t["w"],(b[1]-t["y"])/t["h"]
    style=f'edgeStyle=none;html=0;rounded=0;strokeColor={e["color"]};fontSize=12;labelBackgroundColor=#f8fafc;startArrow=ERone;startFill=0;endArrow=ERmany;endFill=0;exitX={exit_x};exitY={exit_y};entryX={entry_x};entryY={entry_y};exitPerimeter=0;entryPerimeter=0;'
    label=f'{e["id"]} · {e["start"]} — {e["label"]} — {e["end"]}'
    node=ET.SubElement(root,"mxCell",id=e["id"],value=label,style=style,edge="1",parent="1",source=e["source"],target=e["target"])
    geom=ET.SubElement(node,"mxGeometry",relative="1",**{"as":"geometry"})
    if len(e["points"])>2:
        arr=ET.SubElement(geom,"Array",**{"as":"points"})
        for x,y in e["points"][1:-1]: ET.SubElement(arr,"mxPoint",x=str(x),y=str(y))
cell("legend","CHÚ GIẢI\nXanh dương: bảng gốc\nXanh lá: bảng chatbot mới\nCam: bảng cập nhật\nPK: khóa chính; FK: khóa ngoại\n+: trường thêm vào bảng cũ\nR01–R24: mã quan hệ",'text;html=0;fontSize=15;align=left;verticalAlign=top;whiteSpace=wrap;',1710,1435,400,310)
cell("footer","Bản thiết kế gộp theo ảnh ERD; chưa áp dụng vào database. Một số độ dài kiểu dữ liệu trong ảnh gốc bị cắt đã được hoàn thiện nhất quán.",'text;html=0;fontSize=14;align=left;',70,1835,3100,50)
ET.ElementTree(mxfile).write(ROOT/f"{STEM}.drawio",encoding="utf-8",xml_declaration=True)

# Mermaid và JSON dùng chung dữ liệu với ảnh để tránh bỏ sót bảng/khóa.
mmd=["erDiagram"]
for e in EDGES:
    left="o|" if e["start"].startswith("0") else "||"
    mmd.append(f'    {e["source"]} {left}--o{{ {e["target"]} : "{e["id"]} {", ".join(e["fields"])}"')
for t in TABLES:
    mmd.append(f'    {t["id"]} {{')
    for key,name,dtype in t["rows"]:
        base=dtype.split("(")[0].split()[0]
        k=" "+key if key in ("PK","FK","PK,FK") else ""
        mmd.append(f'        {base} {name}{k}')
    mmd.append('    }')
(ROOT/f"{STEM}.mmd").write_text("\n".join(mmd)+"\n",encoding="utf-8")
(ROOT/f"{STEM}.json").write_text(json.dumps(dict(width=WIDTH,height=HEIGHT,tables=TABLES,relationships=EDGES),ensure_ascii=False,indent=2),encoding="utf-8")
print(f"Created {STEM}: 17 tables, 24 relationships; all FK fields mapped; no connector crosses a table.")
