"""VOPC phân tích theo mẫu lớp 3 ngăn; đủ Entity của use case chatbot."""
from pathlib import Path
from html import escape
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
STEM = 'VNWatch-ChatbotAI-VOPC-Entity'
WIDTH, HEIGHT = 3280, 1900
ERD = json.loads((ROOT.parent/'chatbot-erd'/'VNWatch-ERD-day-du.json').read_text(encoding='utf-8'))
ERD_TABLES = {t['id']:t for t in ERD['tables']}
CLASSES = []

def entity(id_, name, table, x, y, w, field_names, methods):
    rows = {r[1]:r for r in ERD_TABLES[table]['rows']}
    assert set(field_names) <= set(rows), (name, set(field_names)-set(rows))
    attributes=[]
    for field in field_names:
        key,_,type_=rows[field]
        camel={'URLNguon':'urlNguon','YDinh':'yDinh'}.get(field,field[0].lower()+field[1:])
        key_label=key if key in ('PK','FK','PK,FK') else ''
        attributes.append(camel+('?' if 'NULL' in type_ else '')+(' {'+key_label+'}' if key_label else ''))
    CLASSES.append(dict(id=id_,name=name,role='entity',table=table,x=x,y=y,w=w,attributes=attributes,methods=methods,fields=field_names))

CLASSES.extend([
    dict(id='form',name='ChatbotForm',role='boundary',x=230,y=280,w=400,
         attributes=['cuaSoChat','oNhapCauHoi','dsChuDeHoTro'],
         methods=['hienThiLoiChao()','nhapCauHoi()','guiTinNhan()','hienThiTraLoi()',
                  'hienThiSanPhamGoiY()','hienThiNguonTraLoi()','dongCuaSo()']),
    dict(id='controller',name='ChatbotController',role='control',x=800,y=280,w=480,
         attributes=['maPhien','maTK?','nguCanhHoiThoai','yDinh','tieuChi','ketQuaTuVan'],
         methods=['moPhienChat()','kiemTraChuPhien()','guiTinNhan()','layLichSuHoiThoai()',
                  'timSanPhamPhuHop()','layKienThucDaDuyet()','goiHeThongAI()',
                  'kiemTraKetQuaVaNguon()','luuKetQuaTuVan()','dongPhienChat()']),
])
entity('account','TaiKhoan','taikhoan',1470,150,460,
       ['MaTK','HoTen','Email','VaiTro','TrangThai'],
       ['layThongTinKhach()','kiemTraTrangThaiTaiKhoan()'])
entity('session','PhienChat','phienchat',2080,150,460,
       ['MaPhien','MaTK','TieuDe','TrangThai','NgayTao','NgayCapNhat'],
       ['taoPhien()','layPhien()','kiemTraChuPhien()','capNhatThoiGian()','dongPhien()'])
entity('message','TinNhanChat','tinnhanchat',2690,150,500,
       ['MaTN','MaPhien','MaTK','NguoiGui','NoiDung','YDinh','CheDo','TenMoHinh','TrangThai','ThoiGian'],
       ['luuTinKhach()','layLichSuTruoc()','luuTinAI()','layLichSuPhien()'])
entity('category','DanhMuc','danhmuc',1470,800,460,
       ['MaDM','TenDM','MaDMCha','ThuTuHienThi','MoTa'],
       ['layDanhMuc()','layDanhMucLienQuan()'])
entity('product','SanPham','sanpham',2080,800,460,
       ['MaSP','MaDM','TenSP','ThuongHieu','KieuMay','ChatLieuDay','GiaBan','SoLuongTon','HinhAnh','ThongSoChiTiet','TrangThai'],
       ['timSanPhamLienQuan()','layThongTinSanPham()','kiemTraConHang()'])
entity('knowledge','KienThucChatbot','kienthucchatbot',2690,800,500,
       ['MaKT','Loai','ChuDe','TieuDe','NoiDung','URLNguon','TrangThai','NguoiDuyet','NgayDuyet','NgayCapNhat'],
       ['layKienThucDaDuyet()','timTheoChuDe()'])
entity('selection','SanPhamGoiY','sanphamgoiy',2080,1450,460,
       ['MaTN','MaSP','ThuTu','LyDo'],
       ['luuDanhSachGoiY()','layDanhSachGoiY()'])
entity('source','NguonTraLoi','nguontraloi',2690,1450,500,
       ['MaNguon','MaTN','MaKT','TieuDeNguon','URLNguon','NoiDungTrichDan','ThoiDiemSuDung'],
       ['luuNguonVaBanChup()','layNguonTheoTinNhan()'])

for c in CLASSES:
    c['h']=72+16+25*len(c['attributes'])+16+25*len(c['methods'])
BY_ID={c['id']:c for c in CLASSES}

# Association của lớp điều khiển tới đủ 8 Entity; giữ cấu trúc như hình mẫu.
EDGES=[
    dict(source='customer',target='form',points=[(119,430),(175,430),(175,450),(230,450)]),
    dict(source='form',target='controller',points=[(630,450),(800,450)]),
    dict(source='controller',target='ai',points=[(1040,BY_ID['controller']['y']+BY_ID['controller']['h']),(1040,1007)]),
    dict(source='controller',target='account',points=[(1280,350),(1360,350),(1360,300),(1470,300)]),
    dict(source='controller',target='session',points=[(1280,390),(1330,390),(1330,120),(2310,120),(2310,150)]),
    dict(source='controller',target='message',points=[(1280,430),(1350,430),(1350,95),(2940,95),(2940,150)]),
    dict(source='controller',target='category',points=[(1280,470),(1380,470),(1380,900),(1470,900)]),
    dict(source='controller',target='product',points=[(1280,510),(1400,510),(1400,710),(2310,710),(2310,800)]),
    dict(source='controller',target='knowledge',points=[(1280,550),(1420,550),(1420,680),(2940,680),(2940,800)]),
    dict(source='controller',target='selection',points=[(1280,590),(1340,590),(1340,1370),(2310,1370),(2310,1450)]),
    dict(source='controller',target='source',points=[(1280,630),(1310,630),(1310,1400),(2940,1400),(2940,1450)]),
]

# Kiểm tra đủ Entity và không để đường liên kết đi xuyên lớp khác.
expected={'taikhoan','phienchat','tinnhanchat','danhmuc','sanpham','kienthucchatbot','sanphamgoiy','nguontraloi'}
assert {c['table'] for c in CLASSES if c['role']=='entity'}==expected
assert len(EDGES)==11
for e in EDGES:
    for a,b in zip(e['points'],e['points'][1:]):
        assert a[0]==b[0] or a[1]==b[1]
        for c in CLASSES:
            if c['id'] in (e['source'],e['target']): continue
            x,y,w,h=(c[k] for k in ('x','y','w','h'))
            if a[0]==b[0]: crossed=x<a[0]<x+w and max(min(a[1],b[1]),y)<min(max(a[1],b[1]),y+h)
            else: crossed=y<a[1]<y+h and max(min(a[0],b[0]),x)<min(max(a[0],b[0]),x+w)
            assert not crossed,(e['source'],e['target'],c['name'])

THEMES={
    'dark':dict(bg='#111417',body='#121619',text='#f8fafc',muted='#bac4cf',line='#a1aab5',
                headers={'boundary':'#1e2b3d','control':'#20321e','entity':'#352b0c'},
                borders={'boundary':'#4f7194','control':'#5f7e4d','entity':'#94772a'}),
    'light':dict(bg='#ffffff',body='#ffffff',text='#111827',muted='#64748b',line='#64748b',
                 headers={'boundary':'#dbeafe','control':'#dcfce7','entity':'#fef3c7'},
                 borders={'boundary':'#56799b','control':'#658254','entity':'#a38a42'}),
}

def build(theme):
    p=THEMES[theme]; svg=[]; counter=0
    page=ET.Element('diagram',id='vopc-entity-'+theme,name='VOPC theo mẫu' if theme=='dark' else 'VOPC nền trắng')
    model=ET.SubElement(page,'mxGraphModel',dx=str(WIDTH),dy=str(HEIGHT),grid='1',gridSize='10',page='1',pageWidth=str(WIDTH),pageHeight=str(HEIGHT),pageScale='1',background=p['bg'])
    root=ET.SubElement(model,'root')
    ET.SubElement(root,'mxCell',id='0'); ET.SubElement(root,'mxCell',id='1',parent='0')

    def new_id():
        nonlocal counter
        counter+=1
        return 'shape_'+str(counter)

    def cell(value,style,x,y,w,h,parent='1',id_=None):
        if parent in BY_ID:
            x-=BY_ID[parent]['x']; y-=BY_ID[parent]['y']
        if parent in ('customer','ai'):
            x-=60 if parent=='customer' else 1000
            y-=380 if parent=='customer' else 995
        node=ET.SubElement(root,'mxCell',id=id_ or new_id(),value=value,style=style,vertex='1',parent=parent)
        ET.SubElement(node,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),**{'as':'geometry'})
        return node

    def text(x,y,value,size=16,bold=False,align='start',parent='1',muted=False):
        color=p['muted'] if muted else p['text']
        svg.append(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{700 if bold else 400}" text-anchor="{align}" fill="{color}">{escape(value)}</text>')
        w=max(100,len(value)*size*.64+20); left=x-w/2 if align=='middle' else x
        cell(value,f'text;html=0;align={"center" if align=="middle" else "left"};verticalAlign=top;spacing=0;fontSize={size};fontColor={color};fontStyle={1 if bold else 0};whiteSpace=wrap;',left,y-size,w,size*1.6,parent)

    def rect(x,y,w,h,fill,stroke,parent='1',id_=None):
        svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="1.3"/>')
        return cell('',f'rounded=0;html=0;fillColor={fill};strokeColor={stroke};container=1;collapsible=0;recursiveResize=0;',x,y,w,h,parent,id_)

    def line(pts,color=None,parent='1'):
        color=color or p['line']; points=' '.join(f'{x},{y}' for x,y in pts)
        svg.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="1.5" stroke-linejoin="round"/>')
        node=ET.SubElement(root,'mxCell',id=new_id(),value='',style=f'edgeStyle=none;rounded=0;startArrow=none;endArrow=none;strokeColor={color};strokeWidth=1.5;',edge='1',parent=parent)
        geom=ET.SubElement(node,'mxGeometry',relative='1',**{'as':'geometry'})
        dx,dy=(BY_ID[parent]['x'],BY_ID[parent]['y']) if parent in BY_ID else ((60,380) if parent=='customer' else (1000,995) if parent=='ai' else (0,0))
        for point,tag in [(pts[0],'sourcePoint'),(pts[-1],'targetPoint')]:
            ET.SubElement(geom,'mxPoint',x=str(point[0]-dx),y=str(point[1]-dy),**{'as':tag})
        if len(pts)>2:
            arr=ET.SubElement(geom,'Array',**{'as':'points'})
            for x,y in pts[1:-1]: ET.SubElement(arr,'mxPoint',x=str(x-dx),y=str(y-dy))

    svg.extend([f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title desc">',
                '<title id="title">VOPC use case Chatbot AI tư vấn khách hàng — đầy đủ 8 Entity liên quan</title>',
                '<desc id="desc">Khách hàng, ChatbotForm, ChatbotController, Hệ thống AI và 8 lớp Entity trong ERD; lớp có ngăn thuộc tính và phương thức.</desc>',
                f'<rect width="{WIDTH}" height="{HEIGHT}" fill="{p["bg"]}"/>'])
    if theme=='dark':
        svg.append('<defs><pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#252c33" stroke-width="0.65"/></pattern></defs>')
        svg.append(f'<rect width="{WIDTH}" height="{HEIGHT}" fill="url(#grid)"/>')
    svg.append('<g font-family="Segoe UI, Arial, sans-serif">')
    bg=cell('',f'rounded=0;fillColor={p["bg"]};strokeColor=none;locked=1;movable=0;resizable=0;selectable=0;connectable=0;',0,0,WIDTH,HEIGHT,id_='background')
    text(45,42,'BIỂU ĐỒ LỚP PHÂN TÍCH (VOPC) — USE CASE CHATBOT AI TƯ VẤN KHÁCH HÀNG',27,True)
    text(45,75,'Theo mẫu Boundary – Control – Entity · đầy đủ 8 Entity liên quan trong ERD VNWatch',16,muted=True)

    # Đường liên kết vẽ dưới các lớp để không che nội dung ngăn.
    for e in EDGES:
        points=' '.join(f'{x},{y}' for x,y in e['points'])
        svg.append(f'<polyline points="{points}" fill="none" stroke="{p["line"]}" stroke-width="1.5" stroke-linejoin="round"/>')

    for c in CLASSES:
        x,y,w,h=(c[k] for k in ('x','y','w','h')); role=c['role']; border=p['borders'][role]
        rect(x,y,w,h,p['body'],border,id_=c['id'])
        rect(x,y,w,72,p['headers'][role],border,c['id'])
        text(x+w/2,y+25,'«'+role+'»',15,False,'middle',c['id'])
        text(x+w/2,y+53,c['name'],21,True,'middle',c['id'])
        for i,attr in enumerate(c['attributes']): text(x+15,y+99+i*25,attr,16,parent=c['id'])
        sep=y+72+16+25*len(c['attributes'])
        line([(x,sep),(x+w,sep)],border,c['id'])
        for i,method in enumerate(c['methods']): text(x+15,sep+27+i*25,method,16,parent=c['id'])

    def actor(id_,x,cy,name):
        ox,oy=(60,380) if id_=='customer' else (1000,995)
        cell('','group;container=1;collapsible=0;recursiveResize=0;',ox,oy,100,150,id_=id_)
        svg.append(f'<circle cx="{x}" cy="{cy}" r="13" fill="none" stroke="{p["text"]}" stroke-width="1.5"/>')
        cell('',f'ellipse;fillColor=none;strokeColor={p["text"]};',x-13,cy-13,26,26,id_)
        for a,b in [((x,cy+13),(x,cy+54)),((x-29,cy+31),(x+29,cy+31)),((x,cy+54),(x-29,cy+80)),((x,cy+54),(x+29,cy+80))]:
            line([a,b],p['text'],id_)
        text(x,cy+110,name,18,True,'middle',id_)
    actor('customer',90,400,'Khách hàng')
    actor('ai',1040,1020,'Hệ thống AI')

    # Các connector gắn thực sự vào group của lớp, để kéo lớp thì đường nối đi cùng.
    actor_bounds={'customer':(60,380,100,150),'ai':(1000,995,100,150)}
    for i,e in enumerate(EDGES,1):
        s,t=e['source'],e['target']
        sb=tuple(BY_ID[s][k] for k in ('x','y','w','h')) if s in BY_ID else actor_bounds[s]
        tb=tuple(BY_ID[t][k] for k in ('x','y','w','h')) if t in BY_ID else actor_bounds[t]
        a,b=e['points'][0],e['points'][-1]
        style=f'edgeStyle=none;rounded=0;html=0;endArrow=none;startArrow=none;strokeColor={p["line"]};strokeWidth=1.5;'
        style+=f'exitX={(a[0]-sb[0])/sb[2]};exitY={(a[1]-sb[1])/sb[3]};entryX={(b[0]-tb[0])/tb[2]};entryY={(b[1]-tb[1])/tb[3]};exitPerimeter=0;entryPerimeter=0;'
        node=ET.SubElement(root,'mxCell',id='association_'+str(i),value='',style=style,edge='1',parent='1',source=s,target=t)
        geom=ET.SubElement(node,'mxGeometry',relative='1',**{'as':'geometry'})
        if len(e['points'])>2:
            arr=ET.SubElement(geom,'Array',**{'as':'points'})
            for x,y in e['points'][1:-1]: ET.SubElement(arr,'mxPoint',x=str(x),y=str(y))

    text(1490,1483,'ĐỦ 8 ENTITY LIÊN QUAN',18,True)
    legend=['TaiKhoan · PhienChat · TinNhanChat','DanhMuc · SanPham · KienThucChatbot','SanPhamGoiY · NguonTraLoi','PK: khóa chính; FK: khóa ngoại','?: có thể NULL','Tên bảng tương ứng trong ERD:','taikhoan, phienchat, tinnhanchat,','danhmuc, sanpham, kienthucchatbot,','sanphamgoiy, nguontraloi']
    for i,item in enumerate(legend): text(1490,1515+i*27,item,15,muted=True)
    text(45,1830,'Hệ thống AI là actor của phân hệ tư vấn. ChatbotController điều phối truy vấn Entity, kiểm tra và lưu kết quả.',16)
    text(45,1865,'VOPC thiết kế theo ERD mới; chỉ liệt kê thuộc tính/phương thức cần cho use case. Các thao tác lưu hội thoại chưa áp dụng vào database đang chạy.',14,muted=True)
    svg.extend(['</g></svg>'])
    suffix='' if theme=='dark' else '-nen-trang'
    (ROOT/(STEM+suffix+'.svg')).write_text('\n'.join(svg),encoding='utf-8')
    return page

mxfile=ET.Element('mxfile',host='app.diagrams.net',type='device')
for theme in ('dark','light'): mxfile.append(build(theme))
ET.ElementTree(mxfile).write(ROOT/(STEM+'.drawio'),encoding='utf-8',xml_declaration=True)
(ROOT/(STEM+'.json')).write_text(json.dumps(dict(classes=CLASSES,associations=EDGES),ensure_ascii=False,indent=2),encoding='utf-8')

mmd=['classDiagram','    direction LR','    class KhachHang {','        <<actor>>','    }','    class HeThongAI {','        <<actor>>','    }']
for c in CLASSES:
    mmd.extend([f'    class {c["name"]} {{',f'        <<{c["role"]}>>'])
    for attr in c['attributes']: mmd.append('        +'+attr.split(' {')[0].replace('?',''))
    for method in c['methods']: mmd.append('        +'+method)
    mmd.append('    }')
names={c['id']:c['name'] for c in CLASSES}; names.update(customer='KhachHang',ai='HeThongAI')
for e in EDGES: mmd.append(f'    {names[e["source"]]} -- {names[e["target"]]}')
(ROOT/(STEM+'.mmd')).write_text('\n'.join(mmd)+'\n',encoding='utf-8')
print('Created VOPC: ChatbotForm, ChatbotController, 8 entities, 2 actors, 11 associations; two draw.io pages.')
