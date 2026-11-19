from pathlib import Path

root = Path(__file__).resolve().parent
source = Path(r'D:\VNWatch\docs\design\chatbot-erd\tao_erd_day_du.py').read_text(encoding='utf-8')
source = source.replace('STEM = "VNWatch-ERD-day-du"', 'STEM = "VNWatch-ERD-HoiThoai-TinNhan"')
injection = '''
# Giữ các bảng gốc, thay bảng tin nhắn cũ và thêm hội thoại.
TABLES = [t for t in TABLES if t['kind'] == 'GỐC']
table('HoiThoai', 2770, 180, [
    ('PK','MaHoiThoai','VARCHAR(36)'), ('FK','MaTK','INT NULL'),
    ('','TieuDe','VARCHAR(150) NULL'), ('','TrangThai','VARCHAR(20)'),
    ('','NgayTao','DATETIME'), ('','NgayCapNhat','DATETIME')], 'MỚI')
table('TinNhan', 2770, 830, [
    ('PK','MaTinNhan','INT'), ('FK','MaHoiThoai','VARCHAR(36)'),
    ('','NguoiGui','VARCHAR(15)'), ('','NoiDung','TEXT'),
    ('','YDinh','VARCHAR(30) NULL'), ('','CheDo','VARCHAR(20) NULL'),
    ('','TenMoHinh','VARCHAR(100) NULL'), ('','TrangThai','VARCHAR(20)'),
    ('','ThoiGian','DATETIME')], 'CẬP NHẬT')
BY_ID = {t['id']: t for t in TABLES}
EDGES = [e for e in EDGES if e['source'] in BY_ID and e['target'] in BY_ID]
rel('taikhoan','HoiThoai',['MaTK'],'Chủ hội thoại',[(2660,290),(2770,290)],2715,260,True)
rel('HoiThoai','TinNhan',['MaHoiThoai'],'Chứa tin nhắn',[(2985,412),(2985,830)],2985,620)
'''
source = source.replace('# Kiểm tra đầy đủ FK', injection+'\n# Kiểm tra đầy đủ FK')
source = source.replace('len(TABLES) == 17 and len(EDGES) == 24','len(TABLES) == 14 and len(EDGES) == 18')
source = source.replace('17 bảng và 24 quan hệ. Gộp 13 bảng ERD gốc với 4 bảng chatbot AI; cập nhật tinnhanchat.', '14 bảng và 18 quan hệ. Thêm HoiThoai, cập nhật tinnhanchat thành TinNhan.')
source = source.replace('17 bảng · 24 quan hệ · 13 bảng từ ERD gốc + 4 bảng chatbot mới · tinnhanchat được cập nhật','14 bảng · 18 quan hệ · Thêm HoiThoai · Cập nhật tinnhanchat thành TinNhan')
source = source.replace('17 bảng · 24 quan hệ · 13 bảng gốc + 4 bảng mới; tinnhanchat được cập nhật','14 bảng · 18 quan hệ · Thêm HoiThoai; cập nhật tinnhanchat thành TinNhan')
source = source.replace('int(edge["id"][1:])>=17 and edge["id"]!="R18"','int(edge["id"][1:])>=17')
source = source.replace('Cam: tinnhanchat đã cập nhật','Cam: TinNhan (thay tinnhanchat)')
source = source.replace('+: trường thêm vào bảng cũ','NULL: thuộc tính không bắt buộc')
source = source.replace('R01–R24','R01–R18')
source = source.replace('17 tables, 24 relationships','14 tables, 18 relationships')
source = source.replace('startArrow=ERone;startFill=0;endArrow=ERmany;', 'startArrow={"ERzeroToOne" if e["start"] == "0..1" else "ERmandOne"};startFill=0;endArrow=ERzeroToMany;')
# Ghi chú giải thích quan hệ tùy chọn và loại người gửi.
source = source.replace("svg.extend([text(1710,1455", '''svg.extend([
    text(2290,1260,"CHATBOT AI",22,700),
    text(2290,1295,"Một tài khoản có 0..N hội thoại.",16),
    text(2290,1325,"Mỗi hội thoại thuộc 0..1 tài khoản (cho phép khách vãng lai).",16),
    text(2290,1355,"Một hội thoại chứa 0..N tin nhắn.",16),
    text(2290,1385,"Mỗi tin nhắn thuộc đúng 1 hội thoại.",16),
    text(2290,1425,"NguoiGui: user / assistant · CheDo: OPENAI / CATALOG",16),
    text(2290,1455,"TinNhan.MaHoiThoai là FK bắt buộc; không lặp MaTK.",16),
    text(2290,1485,"Chatbot đọc SanPham khi tư vấn; không tạo FK trực tiếp.",16),
])
svg.extend([text(1710,1455''')
source = source.replace('ET.ElementTree(mxfile).write(', '''cell("chat-note","CHATBOT AI\\nTaiKhoan 0..1 — 0..N HoiThoai\\nHoiThoai 1 — 0..N TinNhan\\nNguoiGui: user / assistant\\nCheDo: OPENAI / CATALOG\\nTinNhan.MaHoiThoai: FK bắt buộc; không lặp MaTK.\\nChatbot đọc SanPham khi tư vấn; không tạo FK trực tiếp.","text;html=0;fontSize=16;align=left;verticalAlign=top;whiteSpace=wrap;",2290,1235,900,260)
ET.ElementTree(mxfile).write(''')
exec(compile(source, str(root/'generate.py'), 'exec'), {'__file__':str(root/'generate.py')})
