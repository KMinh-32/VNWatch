"""Sinh VOPC và sequence UML từ các đối tượng vector chỉnh sửa được."""
from pathlib import Path
from html import escape
from math import hypot
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent

class Drawing:
    def __init__(self, title, width, height, page_id):
        self.width, self.height = width, height
        self.parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{escape(title)}">',
                      f'<rect width="{width}" height="{height}" fill="#f8fafc"/>', '<g font-family="Segoe UI, Arial, sans-serif">']
        self.diagram = ET.Element('diagram', id=page_id, name=title)
        model = ET.SubElement(self.diagram, 'mxGraphModel', dx=str(width), dy=str(height), grid='1', gridSize='10', page='1', pageWidth=str(width), pageHeight=str(height), pageScale='1')
        self.root = ET.SubElement(model, 'root')
        ET.SubElement(self.root, 'mxCell', id='0')
        ET.SubElement(self.root, 'mxCell', id='1', parent='0')
        self.counter = 0
        self.nodes = {}

    def ident(self):
        self.counter += 1
        return 'shape_' + str(self.counter)

    def cell(self, value, style, x, y, w, h, ident=None, parent='1'):
        ident = ident or self.ident()
        node = ET.SubElement(self.root, 'mxCell', id=ident, value=value, style=style, vertex='1', parent=parent)
        ET.SubElement(node, 'mxGeometry', x=str(x), y=str(y), width=str(w), height=str(h), **{'as': 'geometry'})
        return ident

    def rect(self, x, y, w, h, fill='white', stroke='#94a3b8', radius=4, ident=None):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}"/>')
        return self.cell('', f'rounded={int(radius>0)};arcSize=5;fillColor={fill};strokeColor={stroke};html=0;', x, y, w, h, ident)

    def text(self, x, y, value, size=16, weight=400, color='#1e293b', align='start', bg=False):
        lines = value.split('\n')
        line_h = size * 1.38
        if bg:
            w = max(len(s) for s in lines) * size * .55 + 16
            left = x-w/2 if align=='middle' else x-8
            self.parts.append(f'<rect x="{left}" y="{y-size-3}" width="{w}" height="{line_h*len(lines)+4}" rx="3" fill="#f8fafc"/>')
        for i,line in enumerate(lines):
            self.parts.append(f'<text x="{x}" y="{y+i*line_h}" text-anchor="{align}" font-size="{size}" font-weight="{weight}" fill="{color}">{escape(line)}</text>')
        # draw.io giới hạn chiều rộng nhãn theo độ dài; sửa được như text thông thường.
        w = max(100, max(len(s) for s in lines)*size*.64+24)
        left = x-w/2 if align=='middle' else x
        style = f'text;html=0;align={"center" if align=="middle" else "left"};verticalAlign=top;fontSize={size};fontColor={color};fontStyle={1 if weight>=600 else 0};whiteSpace=wrap;spacing=0;'
        if bg: style += 'labelBackgroundColor=#f8fafc;'
        self.cell(value, style, left, y-size, w, line_h*len(lines)+8)

    def path(self, pts, color='#64748b', dashed=False, arrow=False, ident=None, source=None, target=None, association=False):
        points = ' '.join(f'{x},{y}' for x,y in pts)
        dash = 'stroke-dasharray="7 5"' if dashed else ''
        self.parts.append(f'<polyline points="{points}" fill="none" stroke="#f8fafc" stroke-width="5" stroke-linejoin="round"/>')
        self.parts.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="1.7" {dash} stroke-linejoin="round"/>')
        if arrow:
            a,b=pts[-2],pts[-1]; dx,dy=b[0]-a[0],b[1]-a[1]; length=hypot(dx,dy); ux,uy=dx/length,dy/length
            tip1=(b[0]-ux*12-uy*6,b[1]-uy*12+ux*6)
            tip2=(b[0]-ux*12+uy*6,b[1]-uy*12-ux*6)
            self.parts.append(f'<polyline points="{tip1[0]},{tip1[1]} {b[0]},{b[1]} {tip2[0]},{tip2[1]}" fill="none" stroke="{color}" stroke-width="1.7"/>')
        style=f'edgeStyle=none;rounded=0;strokeColor={color};strokeWidth=1.7;dashed={int(dashed)};endArrow={"open" if arrow else "none"};endFill=0;startArrow=none;'
        attrs=dict(id=ident or self.ident(), value='', style=style, edge='1', parent='1')
        if source and target:
            s,t=self.nodes[source],self.nodes[target]
            a,b=pts[0],pts[-1]
            attrs['source'],attrs['target']=source,target
            attrs['style']+=f'exitX={(a[0]-s[0])/s[2]};exitY={(a[1]-s[1])/s[3]};entryX={(b[0]-t[0])/t[2]};entryY={(b[1]-t[1])/t[3]};exitPerimeter=0;entryPerimeter=0;'
        node=ET.SubElement(self.root,'mxCell',**attrs)
        geom=ET.SubElement(node,'mxGeometry',relative='1',**{'as':'geometry'})
        if not source:
            ET.SubElement(geom,'mxPoint',x=str(pts[0][0]),y=str(pts[0][1]),**{'as':'sourcePoint'})
            ET.SubElement(geom,'mxPoint',x=str(pts[-1][0]),y=str(pts[-1][1]),**{'as':'targetPoint'})
        if len(pts)>2:
            arr=ET.SubElement(geom,'Array',**{'as':'points'})
            for x,y in pts[1:-1]: ET.SubElement(arr,'mxPoint',x=str(x),y=str(y))

    def save(self, stem):
        (ROOT/(stem+'.svg')).write_text('\n'.join(self.parts+['</g></svg>']),encoding='utf-8')
        mxfile=ET.Element('mxfile',host='app.diagrams.net',type='device')
        mxfile.append(self.diagram)
        ET.ElementTree(mxfile).write(ROOT/(stem+'.drawio'),encoding='utf-8',xml_declaration=True)

def classbox(d, ident, name, role, tech, x,y,w, fields, operations):
    h=89+28*len(fields)+(18+28*len(operations) if operations else 0)
    color={'boundary':'#e1d5e7','control':'#ffe6cc','entity':'#dae8fc'}[role]
    d.nodes[ident]=(x,y,w,h)
    before=len(d.root)
    d.rect(x,y,w,h,'white','#94a3b8',4,ident)
    d.rect(x+1,y+1,w-2,80,color,color,0)
    d.text(x+w/2,y+24,'«'+role+'»',14,500,'#475569','middle')
    d.text(x+w/2,y+49,name,20,700,align='middle')
    d.text(x+w/2,y+70,tech,12,400,'#475569','middle')
    for i,f in enumerate(fields): d.text(x+15,y+106+i*28,f,15)
    if operations:
        sep=y+89+28*len(fields)
        d.path([(x,sep),(x+w,sep)],color='#cbd5e1')
        for i,op in enumerate(operations): d.text(x+15,sep+27+i*28,op,15)
    # Nhóm nội dung vào chính ô lớp: kéo lớp trong draw.io sẽ kéo theo tên/thuộc tính.
    base=d.root[before]
    base.set('style',base.get('style')+'container=1;collapsible=0;recursiveResize=0;')
    for child in list(d.root)[before+1:]:
        child.set('parent',ident)
        geom=child.find('mxGeometry')
        if child.get('vertex')=='1':
            geom.set('x',str(float(geom.get('x'))-x))
            geom.set('y',str(float(geom.get('y'))-y))
        else:
            for point in geom.findall('.//mxPoint'):
                point.set('x',str(float(point.get('x'))-x))
                point.set('y',str(float(point.get('y'))-y))
    return h

# VOPC: boundary/control/entity, theo use case tư vấn; không lặp toàn bộ thuộc tính ERD.
v=Drawing('VOPC — Chatbot AI',2540,1830,'vopc-chatbot')
v.text(55,48,'VNWATCH · VOPC — CHATBOT AI',30,700)
v.text(55,83,'UC-CHAT: Tư vấn sản phẩm, thương hiệu và chính sách theo dữ liệu website',17,color='#475569')
v.text(55,112,'Thiết kế theo ERD 17 bảng · lớp thực thể chỉ hiển thị thuộc tính liên quan',14,color='#64748b')
classbox(v,'ui','GiaoDienChat','boundary','React / TypeScript',200,200,360,[],['+ guiTinNhan(message, MaPhien?)','+ hienThiCauTraLoi(reply)','+ hienThiSanPhamVaNguon()'])
classbox(v,'service','DieuKhienChat','control','NestJS: AssistantController + AssistantService',740,200,520,[],[
    '+ kiemTraYeuCauVaQuyenPhien()','+ moHoacLayPhienChat()','+ layLichSuVaNguCanhDaDuyet()',
    '+ luuTinKhachVaTinAIChoXuLy()','+ kiemTraKetQuaAgent()','+ luuKetQuaTrongTransaction()'])
classbox(v,'agent','BoTuVanAI','control','FastAPI: phân tích + dựng câu trả lời',1500,200,420,[],[
    '+ lapKeHoachTuVan()','+ phanTichBangQuyTac()','+ dungTraLoiTuNguCanh()'])
classbox(v,'openai','CongOpenAI','boundary','Dịch vụ bên ngoài · tùy cấu hình',2130,200,350,[],['+ taoKeHoachChiDoc()'])
classbox(v,'account','TaiKhoan','entity','Bảng: taikhoan',50,760,380,['MaTK: int {PK}','HoTen: string','VaiTro: string'],[])
classbox(v,'session','PhienChat','entity','Bảng: phienchat',570,760,400,['MaPhien: UUID {PK}','MaTK: int? {FK}','TrangThai: string','NgayCapNhat: datetime'],[])
classbox(v,'message','TinNhanChat','entity','Bảng: tinnhanchat',1120,760,430,[
    'MaTN: int {PK}; MaPhien: UUID {FK}','MaTK: int? {FK}; NguoiGui: string','NoiDung: text; YDinh: string?',
    'CheDo: string?; TenMoHinh: string?','TrangThai: string; ThoiGian: datetime'],[])
classbox(v,'knowledge','KienThucChatbot','entity','Bảng: kienthucchatbot',1740,760,440,[
    'MaKT: int {PK}; Loai: string','ChuDe: string; NoiDung: text','TrangThai: string; URLNguon: string?',
    'NguoiDuyet: int? {FK}'],[])
classbox(v,'category','DanhMuc','entity','Bảng: danhmuc',50,1330,380,['MaDM: int {PK}','TenDM: string'],[])
classbox(v,'product','SanPham','entity','Bảng: sanpham',570,1330,400,[
    'MaSP: string {PK}; MaDM: int {FK}','TenSP: string; ThuongHieu: string','GiaBan: decimal; SoLuongTon: int','TrangThai: string'],[])
classbox(v,'selection','SanPhamGoiY','entity','Bảng: sanphamgoiy',1120,1330,430,[
    'MaTN: int {PK, FK}','MaSP: string {PK, FK}','ThuTu: int; LyDo: string?'],[])
classbox(v,'source','NguonTraLoi','entity','Bảng: nguontraloi',1740,1330,440,[
    'MaNguon: int {PK}; MaTN: int {FK}','MaKT: int? {FK}; URLNguon: string?',
    'TieuDeNguon: string','NoiDungTrichDan: text?'],[])

# Actor khách hàng.
v.parts.append('<circle cx="85" cy="240" r="16" fill="white" stroke="#475569" stroke-width="2"/>')
v.cell('', 'ellipse;fillColor=#ffffff;strokeColor=#475569;',69,224,32,32)
for a,b in [((85,256),(85,310)),((55,274),(115,274)),((85,310),(58,342)),((85,310),(112,342))]: v.path([a,b])
v.text(85,373,'Khách hàng',15,600,align='middle')
v.path([(120,280),(200,280)],arrow=True)

edges=[
    ('ui','service',[(560,285),(740,285)],'gửi / nhận kết quả',650,267,True),
    ('service','agent',[(1260,310),(1500,310)],'HTTP nội bộ + ngữ cảnh',1380,285,True),
    ('agent','openai',[(1920,285),(2130,285)],'Plan chỉ đọc',2025,262,True),
    ('service','session',[(870,475),(870,680),(770,680),(770,760)],'mở / kiểm tra phiên',790,660,True),
    ('service','message',[(1180,475),(1180,640),(1335,640),(1335,760)],'lưu / đọc tin',1270,620,True),
    ('service','product',[(740,425),(520,425),(520,1260),(770,1260),(770,1330)],'tra cứu catalog',660,1239,True),
    ('service','knowledge',[(1080,475),(1080,580),(1960,580),(1960,760)],'đọc DA_DUYET',1850,560,True),
    ('service','selection',[(740,410),(475,410),(475,1170),(1070,1170),(1070,1490),(1120,1490)],'lưu gợi ý',990,1150,True),
    ('service','source',[(1210,475),(1210,530),(2250,530),(2250,1460),(2180,1460)],'lưu nguồn + bản chụp',2260,1230,True),
    ('account','session',[(430,850),(570,850)],'0..1 — 0..N',500,830,False),
    ('session','message',[(970,850),(1120,850)],'1 — 0..N',1045,830,False),
    ('account','message',[(430,910),(490,910),(490,1090),(1060,1090),(1060,930),(1120,930)],'người gửi: 0..1 — 0..N',785,1070,False),
    ('category','product',[(430,1440),(570,1440)],'1 — 0..N',500,1420,False),
    ('product','selection',[(970,1440),(1120,1440)],'1 — 0..N',1045,1420,False),
    ('message','selection',[(1335,989),(1335,1330)],'1 — 0..N gợi ý',1335,1250,False),
    ('message','source',[(1550,930),(1650,930),(1650,1460),(1740,1460)],'1 — 0..N nguồn',1650,1160,False),
    ('knowledge','source',[(1960,961),(1960,1330)],'0..1 — 0..N tham chiếu',1960,1260,False),
]
for source,target,points,*_ in edges:
    for a,b in zip(points,points[1:]):
        for ident,(x,y,w,h) in v.nodes.items():
            if ident in (source,target): continue
            if a[0]==b[0]:
                crossed=x<a[0]<x+w and max(min(a[1],b[1]),y)<min(max(a[1],b[1]),y+h)
            else:
                crossed=y<a[1]<y+h and max(min(a[0],b[0]),x)<min(max(a[0],b[0]),x+w)
            assert not crossed, f'{source}->{target} crosses {ident}'
for s,t,pts,label,lx,ly,dep in edges:
    v.path(pts, color='#7c5b92' if dep else '#64748b', dashed=dep, arrow=dep, source=s,target=t)
for s,t,pts,label,lx,ly,dep in edges:
    v.text(lx,ly,label,13,color='#7c5b92' if dep else '#475569',align='middle',bg=True)
v.text(2260,810,'QUY ƯỚC',16,700)
for i,line in enumerate(['Tím: boundary','Cam: control','Xanh: entity','Nét đứt: sử dụng','Nét liền: liên kết','? : có thể NULL']): v.text(2260,846+i*30,line,14)
v.text(55,1700,'DieuKhienChat lưu dữ liệu tại NestJS; FastAPI/OpenAI không tự truy cập hay ghi cơ sở dữ liệu.',16,600)
v.text(55,1734,'Khách chưa đăng nhập vẫn được tư vấn. Mua hàng áp dụng luồng đăng nhập và đặt hàng riêng của website.',15,color='#475569')
v.text(55,1768,'Đây là VOPC thiết kế theo ERD mới; các lớp/hoạt động lưu phiên, tin nhắn và nguồn cần được triển khai thêm.',14,color='#64748b')
v.save('VNWatch-ChatbotAI-VOPC')

# Sequence: các lifeline thực thi; database và OpenAI là hệ thống ngoài lớp điều khiển.
s=Drawing('Sequence — Chatbot AI',2520,3420,'sequence-chatbot')
s.text(55,48,'VNWATCH · SEQUENCE — CHATBOT AI',30,700)
s.text(55,83,'Tư vấn theo ERD mới: kiểm tra phiên → ngữ cảnh → AI / dự phòng → lưu kết quả → hiển thị',16,color='#475569')
actors=[('customer',130,'Khách hàng','Khách vãng lai / đã đăng nhập'),('ui',480,'GiaoDienChat','React'),
        ('controller',840,'AssistantController','NestJS'),('service',1200,'AssistantService','NestJS'),
        ('db',1560,'Cơ sở dữ liệu','PostgreSQL / Prisma'),('agent',1940,'BoTuVanAI','FastAPI'),('openai',2320,'OpenAI','Dịch vụ bên ngoài')]
xs={ident:x for ident,x,title,sub in actors}
for ident,x,title,sub in actors:
    header_w=220 if ident=='customer' else 280
    s.rect(x-header_w/2,145,header_w,76,'#dae8fc' if ident=='db' else '#e1d5e7' if ident in ('ui','openai') else '#ffe6cc' if ident in ('controller','service','agent') else 'white')
    s.text(x,177,title,18,700,align='middle')
    s.text(x,201,sub,12,color='#475569',align='middle')
    s.path([(x,221),(x,3190)],color='#94a3b8',dashed=True)

def frame(y,h,operator,label,x=35,w=2450,split=None,other=None):
    # Nền trong suốt để các lifeline còn nhìn được.
    s.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="#64748b" stroke-width="1.5"/>')
    s.cell('', 'rounded=0;fillColor=none;strokeColor=#64748b;',x,y,w,h)
    s.rect(x,y,90,30,'#e2e8f0','#64748b',0)
    s.text(x+45,y+22,operator,15,700,align='middle')
    s.text(x+106,y+23,label,14,600,color='#334155',bg=True)
    if split:
        s.path([(x,split),(x+w,split)],dashed=True)
        s.text(x+18,split+28,other,14,600,color='#334155',bg=True)

frame(750,310,'break','[Không có quyền truy cập phiên: kết thúc yêu cầu]')
frame(1500,1670,'alt','[FastAPI khả dụng, phản hồi và kiểm tra kết quả hợp lệ]',split=2700,other='[FastAPI lỗi / timeout hoặc phản hồi không hợp lệ]')
frame(1560,390,'alt','[Có cấu hình OpenAI và nhận được Plan hợp lệ]',x=1760,w=710,split=1790,other='[Chưa có API key / lỗi OpenAI / Plan không hợp lệ]')

def msg(y,from_,to,caption,reply=False):
    a,b=xs[from_],xs[to]
    if a==b:
        s.path([(a,y),(a+80,y),(a+80,y+32),(a,y+32)],color='#334155',dashed=reply,arrow=True)
        # Canh trái để nhãn self-call không đè lên đường vòng.
        s.text(a+96,y-3,caption,14,color='#334155',bg=True)
    else:
        s.path([(a,y),(b,y)],color='#334155',dashed=reply,arrow=True)
        lines=len(caption.split('\n'))
        s.text((a+b)/2,y-13-(lines-1)*19,caption,14,color='#334155',align='middle',bg=True)

msg(285,'customer','ui','Nhập câu hỏi')
msg(375,'ui','controller','POST /api/v1/assistant/chat\n{message, MaPhien?} + cookie')
msg(465,'controller','controller','Kiểm tra DTO, rate limit;\nlấy danh tính từ cookie')
msg(555,'controller','service','chat(message, MaPhien?, nguoiGoi)')
msg(635,'service','db','Tìm / tạo phienchat;\nkiểm tra chủ phiên / khách')
msg(715,'db','service','Phiên mới / hợp lệ hoặc từ chối',True)
msg(830,'service','controller','Từ chối truy cập phiên',True)
msg(910,'controller','ui','HTTP 403',True)
msg(990,'ui','customer','Thông báo không có quyền',True)
msg(1140,'service','db','T1: INSERT KHACH (HOAN_TAT)\n+ TRO_LY (DANG_XU_LY)')
msg(1215,'db','service','MaPhien, MaTNKhach, MaTNAI',True)
msg(1300,'service','db','Đọc lịch sử HOAN_TAT,\nsanpham, danhmuc,\nkienthucchatbot = DA_DUYET')
msg(1385,'db','service','Lịch sử + catalog + kiến thức',True)
msg(1460,'service','agent','POST /internal/chat\nCâu hỏi + ngữ cảnh đã chọn')
msg(1650,'agent','openai','Phân tích câu hỏi → Plan chỉ đọc')
msg(1735,'openai','agent','Plan: ý định, bộ lọc, ID',True)
msg(1880,'agent','agent','Phân tích bằng quy tắc\nCheDo = DU_PHONG')
msg(2030,'agent','agent','Đối chiếu Plan và ngữ cảnh;\ndựng câu trả lời có căn cứ')
msg(2120,'agent','service','Reply + MaSP + nguồn\n+ YDinh, CheDo, TenMoHinh?',True)
msg(2210,'service','service','Kiểm tra ID sản phẩm, nguồn;\nchỉ chấp nhận dữ liệu đã cung cấp')
msg(2305,'service','db','T2: hoàn tất tin AI; lưu\nsanphamgoiy, nguontraloi;\ncập nhật phienchat (transaction)')
msg(2390,'db','service','COMMIT thành công',True)
msg(2475,'service','controller','ChatReply đã lưu',True)
msg(2560,'controller','ui','HTTP 200: MaPhien, MaTN,\ncâu trả lời, sản phẩm, nguồn, CheDo',True)
msg(2640,'ui','customer','Hiển thị câu trả lời và gợi ý',True)
msg(2790,'service','db','Đặt tin AI: TrangThai = LOI')
msg(2870,'db','service','Đã cập nhật',True)
msg(2950,'service','controller','Lỗi dịch vụ',True)
msg(3030,'controller','ui','HTTP 503 + thông báo',True)
msg(3110,'ui','customer','Hiển thị lỗi / nút thử lại',True)
s.rect(55,3230,2410,118,'#fff4d6','#d6b656',4)
s.text(75,3260,'T1 / T2 là các transaction ngắn; không giữ transaction trong lúc gọi AI. Chỉ trả thành công sau khi T2 COMMIT.',15,600)
s.text(75,3290,'Nếu T2 lỗi: rollback, trả lỗi lưu dữ liệu; không báo câu trả lời đã lưu thành công. Khách không có quyền thì dừng tại khung break.',14)
s.text(75,3320,'Không có sản phẩm / kiến thức phù hợp: hỏi rõ thêm hoặc nói chưa có dữ liệu; không tạo sản phẩm hay nguồn giả.',14)
s.text(55,3386,'Thiết kế theo ERD mới; ghi lịch sử / kiến thức DB chưa được triển khai trong mã nguồn hiện tại. OpenAI chỉ lập Plan, ứng dụng dựng nội dung từ dữ liệu.',14,color='#64748b')
s.save('VNWatch-ChatbotAI-Sequence')

combined=ET.Element('mxfile',host='app.diagrams.net',type='device')
combined.append(v.diagram)
combined.append(s.diagram)
ET.ElementTree(combined).write(ROOT/'VNWatch-ChatbotAI-UML.drawio',encoding='utf-8',xml_declaration=True)
print('Created VOPC and Sequence SVG / draw.io; combined draw.io has 2 pages.')
