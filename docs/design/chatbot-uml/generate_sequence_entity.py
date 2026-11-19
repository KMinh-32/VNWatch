"""Sequence phân tích theo mẫu boundary/control/entity, không phải sơ đồ triển khai."""
from pathlib import Path
from html import escape
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
STEM = 'VNWatch-ChatbotAI-Sequence-Entity'
WIDTH, HEIGHT = 3320, 2730
PARTICIPANTS = [
    ('customer',120,'Khách hàng','actor',''),
    ('form',450,'ChatbotForm','boundary',''),
    ('controller',790,'ChatbotController','control',''),
    ('session',1120,'PhienChat','entity','phienchat'),
    ('message',1460,'TinNhanChat','entity','tinnhanchat'),
    ('product',1800,'SanPham','entity','sanpham'),
    ('knowledge',2140,'KienThucChatbot','entity','kienthucchatbot'),
    ('selection',2480,'SanPhamGoiY','entity','sanphamgoiy'),
    ('source',2820,'NguonTraLoi','entity','nguontraloi'),
    ('ai',3160,'Hệ thống AI','actor',''),
]
XS = {p[0]:p[1] for p in PARTICIPANTS}

MESSAGES = [
    ('customer','form','Chọn biểu tượng chatbot',False),
    ('form','controller','moPhienChat()',False),
    ('controller','session','taoPhien(MaTK?)',False),
    ('session','controller','MaPhien',True),
    ('controller','form','traPhienChat(MaPhien)',True),
    ('form','customer','Hiển thị khung chat và lời chào',True),
    ('customer','form','Nhập câu hỏi và nhấn Gửi',False),
    ('form','controller','guiTinNhan(MaPhien, NoiDung)',False),
    ('controller','message','luuTinKhach(MaPhien, NoiDung)',False),
    ('message','controller','MaTNKhach',True),
    ('controller','message','layLichSuTruoc(MaPhien, MaTNKhach)',False),
    ('message','controller','lichSuHoiThoai',True),
    ('controller','product','timSanPhamLienQuan(NoiDung)',False),
    ('product','controller','danhSachSanPham (giá, tồn kho, thương hiệu)',True),
    ('controller','knowledge','layKienThucDaDuyet(NoiDung)',False),
    ('knowledge','controller','kienThucVaNguonDaDuyet',True),
    ('controller','ai','tuVan(NoiDung, lichSuHoiThoai, danhSachSanPham, kienThucVaNguonDaDuyet)',False),
    ('ai','controller','ketQuaTuVan: nội dung, sản phẩm gợi ý, nguồn, YDinh, CheDo, TenMoHinh?',True),
    ('controller','controller','kiemTraKetQuaVaNguon()',False),
    ('controller','message','luuTinAI(MaPhien, ketQuaTuVan, HOAN_TAT)',False),
    ('message','controller','MaTNAI',True),
    ('controller','selection','luuDanhSachGoiY(MaTNAI, danhSachGoiY)',False),
    ('selection','controller','Đã lưu danh sách gợi ý',True),
    ('controller','source','luuNguonVaBanChup(MaTNAI, danhSachNguon)',False),
    ('source','controller','Đã lưu nguồn trả lời',True),
    ('controller','session','capNhatThoiGian(MaPhien)',False),
    ('session','controller','Đã cập nhật phiên',True),
    ('controller','form','traKetQua(MaPhien, MaTNAI, cauTraLoi, sanPhamGoiY, nguon)',True),
    ('form','customer','Hiển thị câu trả lời, sản phẩm gợi ý và nguồn',True),
]

def ypos(i): return 350+(i-1)*72+(75 if i>=20 else 0)

mxfile = ET.Element('mxfile',host='app.diagrams.net',type='device')
diagram = ET.SubElement(mxfile,'diagram',id='sequence-chatbot-entity',name='Sequence Chatbot — mẫu Entity')
model = ET.SubElement(diagram,'mxGraphModel',dx=str(WIDTH),dy=str(HEIGHT),grid='1',gridSize='10',page='1',pageWidth=str(WIDTH),pageHeight=str(HEIGHT),pageScale='1')
root = ET.SubElement(model,'root')
ET.SubElement(root,'mxCell',id='0'); ET.SubElement(root,'mxCell',id='1',parent='0')
counter = 0
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title desc">',
       '<title id="title">Sequence Chatbot AI theo mẫu ChatbotForm, ChatbotController và Entity</title>',
       '<desc id="desc">Luồng cơ bản, mười đường sống, sáu Entity và 29 thông điệp đánh số.</desc>',
       f'<rect width="{WIDTH}" height="{HEIGHT}" fill="white"/>','<g font-family="Segoe UI, Arial, sans-serif">']

def ident():
    global counter
    counter += 1
    return 'shape_'+str(counter)

def cell(value,style,x,y,w,h,parent='1',id_=None):
    node=ET.SubElement(root,'mxCell',id=id_ or ident(),value=value,style=style,vertex='1',parent=parent)
    if parent!='1':
        px=XS[parent.removeprefix('participant_')]-130
        x,y=x-px,y-88
    ET.SubElement(node,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),**{'as':'geometry'})
    return node

def text(x,y,value,size=16,bold=False,align='middle',color='#1f2937',parent='1',emit_cell=True):
    lines=value.split('\n'); line_h=size*1.35
    for j,line in enumerate(lines):
        svg.append(f'<text x="{x}" y="{y+j*line_h}" text-anchor="{align}" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}">{escape(line)}</text>')
    w=max(150,max(len(line) for line in lines)*size*.64+24)
    left=x-w/2 if align=='middle' else x
    if emit_cell:
        cell(value,f'text;html=0;fontSize={size};fontStyle={1 if bold else 0};fontColor={color};align={"center" if align=="middle" else "left"};verticalAlign=top;spacing=0;whiteSpace=wrap;',left,y-size,w,line_h*len(lines)+8,parent)

def rect(x,y,w,h,fill='white',stroke='#94a3b8',parent='1'):
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>')
    cell('',f'rounded=0;html=0;fillColor={fill};strokeColor={stroke};',x,y,w,h,parent)

def circle(x,y,r,fill,parent):
    svg.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="#64748b" stroke-width="1.7"/>')
    cell('',f'ellipse;html=0;fillColor={fill};strokeColor=#64748b;strokeWidth=1.7;',x-r,y-r,2*r,2*r,parent)

def line(pts,dashed=False,parent='1',color='#64748b'):
    points=' '.join(f'{x},{y}' for x,y in pts)
    dash='stroke-dasharray="6 5"' if dashed else ''
    svg.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="1.5" {dash}/>')
    node=ET.SubElement(root,'mxCell',id=ident(),value='',style=f'edgeStyle=none;rounded=0;endArrow=none;startArrow=none;dashed={int(dashed)};strokeColor={color};',edge='1',parent=parent)
    g=ET.SubElement(node,'mxGeometry',relative='1',**{'as':'geometry'})
    px=XS[parent.removeprefix('participant_')]-130 if parent!='1' else 0
    py=88 if parent!='1' else 0
    for p,kind in [(pts[0],'sourcePoint'),(pts[-1],'targetPoint')]: ET.SubElement(g,'mxPoint',x=str(p[0]-px),y=str(p[1]-py),**{'as':kind})
    if len(pts)>2:
        a=ET.SubElement(g,'Array',**{'as':'points'})
        for x,y in pts[1:-1]: ET.SubElement(a,'mxPoint',x=str(x-px),y=str(y-py))

text(45,42,'BIỂU ĐỒ TRÌNH TỰ USE CASE CHATBOT AI TƯ VẤN KHÁCH HÀNG — LUỒNG CƠ BẢN',27,True,'start')
text(45,75,'Mô hình phân tích theo mẫu Boundary – Control – Entity · Entity ánh xạ tới các bảng trong ERD VNWatch',16,False,'start','#64748b')

for id_,x,name,role,table in PARTICIPANTS:
    group='participant_'+id_
    cell('','group;container=1;collapsible=0;recursiveResize=0;',x-130,88,260,2405,id_=group)
    if role=='actor':
        circle(x,112,12,'white',group)
        for a,b in [((x,124),(x,163)),((x-26,140),(x+26,140)),((x,163),(x-26,193)),((x,163),(x+26,193))]: line([a,b],parent=group)
    else:
        circle(x,141,28,{'boundary':'#cfe8fc','control':'#d5e8d4','entity':'#fff2cc'}[role],group)
        if role=='boundary':
            line([(x-42,117),(x-42,165)],parent=group)
            line([(x-42,141),(x-28,141)],parent=group)
        elif role=='control':
            line([(x+20,120),(x+5,106),(x-13,113)],parent=group)
            line([(x-3,104),(x-13,113),(x-1,117)],parent=group)
        else:
            line([(x-30,171),(x+30,171)],parent=group)
    text(x,217,name,19,True,parent=group)
    text(x,242,'«'+role+'»'+(' · '+table if table else ''),12,color='#64748b',parent=group)
    line([(x,262),(x,2485)],True,group,'#94a3b8')

# Khung kết quả thành công: các lời gọi Entity trong cùng một transaction.
frame_y=ypos(20)-72
frame_bottom=ypos(27)+35
rect(600,frame_y,2295,frame_bottom-frame_y,'none','#94a3b8')
rect(600,frame_y,110,31,'#f1f5f9','#94a3b8')
text(655,frame_y+22,'critical',15,True)
text(875,frame_y+23,'[Lưu câu trả lời, gợi ý, nguồn và cập nhật phiên trong một transaction]',14,False,'start','#475569')

# Activation bar: mỗi Entity chỉ hoạt động khi được Controller gọi.
activations=[('form',1,6),('form',7,29),('controller',2,5),('controller',8,28),
             ('session',3,4),('message',9,10),('message',11,12),('product',13,14),
             ('knowledge',15,16),('ai',17,18),('message',20,21),('selection',22,23),
             ('source',24,25),('session',26,27)]
for id_,first,last in activations:
    rect(XS[id_]-6,ypos(first),12,ypos(last)-ypos(first)+6,'#f8fafc','#94a3b8','participant_'+id_)

for i,(from_,to,caption,reply) in enumerate(MESSAGES,1):
    y=ypos(i); x1,x2=XS[from_],XS[to]
    # Thông điệp bắt đầu/kết thúc tại cạnh activation bar.
    source_offset=0 if from_=='customer' else 6
    target_offset=0 if to=='customer' else 6
    if x1<x2: a,b=x1+source_offset,x2-target_offset
    elif x1>x2: a,b=x1-source_offset,x2+target_offset
    else: a,b=x1+6,x2+6
    if from_==to:
        pts=[(a,y),(a+94,y),(a+94,y+30),(b,y+30)]
    else:
        pts=[(a,y),(b,y)]
    points=' '.join(f'{x},{yp}' for x,yp in pts)
    dash='stroke-dasharray="7 5"' if reply else ''
    svg.append(f'<polyline points="{points}" fill="none" stroke="#1f2937" stroke-width="1.6" {dash}/>')
    last,previous=pts[-1],pts[-2]
    direction=1 if last[0]>previous[0] else -1
    wings=[(last[0]-direction*11,last[1]-5),(last[0],last[1]),(last[0]-direction*11,last[1]+5)]
    wing_pts=' '.join(f'{x},{yp}' for x,yp in wings)
    if reply: svg.append(f'<polyline points="{wing_pts}" fill="none" stroke="#1f2937" stroke-width="1.6"/>')
    else: svg.append(f'<polygon points="{wing_pts}" fill="#1f2937"/>')
    label=str(i)+': '+caption
    if from_==to:
        # Self-call dùng nhãn bên phải để nhìn được đường vòng.
        text(a+109,y-5,label,15,False,'start',emit_cell=False)
    else:
        text((a+b)/2,y-14,label,15,emit_cell=False)
    style=f'edgeStyle=none;rounded=0;html=0;strokeColor=#1f2937;strokeWidth=1.6;endArrow={"open" if reply else "block"};endFill={0 if reply else 1};startArrow=none;dashed={int(reply)};fontSize=15;labelBackgroundColor=#ffffff;whiteSpace=wrap;'
    # Cổng nối vào group lifeline giúp đường nối đi cùng khi di chuyển cột trong draw.io.
    a0,b0=pts[0],pts[-1]
    style+=f'exitX={(a0[0]-(x1-130))/260};exitY={(a0[1]-88)/2405};entryX={(b0[0]-(x2-130))/260};entryY={(b0[1]-88)/2405};exitPerimeter=0;entryPerimeter=0;'
    node=ET.SubElement(root,'mxCell',id='message_'+str(i),value=label,style=style,edge='1',parent='1',source='participant_'+from_,target='participant_'+to)
    g=ET.SubElement(node,'mxGeometry',relative='1',**{'as':'geometry'})
    ET.SubElement(g,'mxPoint',x='0',y='-14',**{'as':'offset'})
    if len(pts)>2:
        arr=ET.SubElement(g,'Array',**{'as':'points'})
        for x,yp in pts[1:-1]: ET.SubElement(arr,'mxPoint',x=str(x),y=str(yp))

rect(45,2518,3230,132,'#f8fafc','#cbd5e1')
text(65,2547,'Entity dùng trong luồng: PhienChat, TinNhanChat, SanPham, KienThucChatbot, SanPhamGoiY, NguonTraLoi.',16,True,'start')
text(65,2578,'MaTK lấy từ ngữ cảnh đăng nhập; khách vãng lai có MaTK = NULL. Chỉ dùng kiến thức DA_DUYET. Chỉ hiển thị kết quả sau COMMIT.',15,False,'start')
text(65,2609,'Hệ thống AI là phân hệ tư vấn (FastAPI, OpenAI nếu cấu hình). ChatbotController kiểm tra ID sản phẩm và nguồn trước khi lưu.',15,False,'start')
text(65,2636,'Các lớp Entity biểu diễn truy cập bảng ERD. Đây là sequence phân tích luồng cơ bản; các nhánh lỗi/dự phòng nằm ở thiết kế mở rộng.',14,False,'start','#64748b')
text(45,2694,'Bản thiết kế theo ERD mới; thao tác lưu lịch sử/nguồn chưa được triển khai vào database đang chạy.',14,False,'start','#64748b')
svg.extend(['</g></svg>'])
(ROOT/(STEM+'.svg')).write_text('\n'.join(svg),encoding='utf-8')
ET.ElementTree(mxfile).write(ROOT/(STEM+'.drawio'),encoding='utf-8',xml_declaration=True)

# Mermaid giữ cùng thứ tự đối tượng và thông điệp để đối chiếu nội dung.
mmd=['sequenceDiagram']
for id_,x,name,role,table in PARTICIPANTS:
    mmd.append(f'    {"actor" if role=="actor" else "participant"} {id_} as {name}')
for i,(from_,to,caption,reply) in enumerate(MESSAGES,1):
    if i==20: mmd.append('    critical Luu ket qua trong mot transaction')
    mmd.append(f'    {from_}{"-->>" if reply else "->>"}{to}: {i}: {caption}')
    if i==27: mmd.append('    end')
(ROOT/(STEM+'.mmd')).write_text('\n'.join(mmd)+'\n',encoding='utf-8')
assert len(PARTICIPANTS)==10 and len(MESSAGES)==29
assert [p[2] for p in PARTICIPANTS][1:3]==['ChatbotForm','ChatbotController']
assert [p[3] for p in PARTICIPANTS][3:-1]==['entity']*6
print('Created sequence: ChatbotForm, ChatbotController, 6 Entity lifelines, AI actor; 29 messages.')
