"""VOPC biến thể: Controller giữ tham chiếu Entity bằng association có hướng."""
from pathlib import Path
from html import escape
from math import hypot
import json
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parent
STEM='VNWatch-ChatbotAI-VOPC-ControllerAssociation'
WIDTH,HEIGHT=3600,2350
BASE=json.loads((ROOT/'VNWatch-ChatbotAI-VOPC-Entity.json').read_text(encoding='utf-8'))
ERD=json.loads((ROOT.parent/'chatbot-erd'/'VNWatch-ERD-day-du.json').read_text(encoding='utf-8'))
CLASSES=BASE['classes']
REFERENCES=[
    dict(target='account',property='taiKhoan',type='TaiKhoan',multiplicity='0..1'),
    dict(target='session',property='phienChat',type='PhienChat',multiplicity='1'),
    dict(target='message',property='lichSuHoiThoai',type='TinNhanChat',multiplicity='0..*'),
    dict(target='category',property='danhMucLienQuan',type='DanhMuc',multiplicity='0..*'),
    dict(target='product',property='sanPhamLienQuan',type='SanPham',multiplicity='0..*'),
    dict(target='knowledge',property='kienThucSuDung',type='KienThucChatbot',multiplicity='0..*'),
    dict(target='selection',property='goiYTraLoi',type='SanPhamGoiY',multiplicity='0..*'),
    dict(target='source',property='nguonTraLoi',type='NguonTraLoi',multiplicity='0..*'),
]
controller=next(c for c in CLASSES if c['id']=='controller')
controller['attributes'].extend(f'{r["property"]}: {r["type"]} [{r["multiplicity"]}]' for r in REFERENCES)
controller['h']=72+16+25*len(controller['attributes'])+16+25*len(controller['methods'])
POSITIONS={'form':(230,400),'controller':(800,400),'account':(1600,230),'session':(2240,230),
           'message':(2880,230),'category':(1600,1000),'product':(2240,1000),'knowledge':(2880,1000),
           'selection':(2240,1770),'source':(2880,1770)}
for c in CLASSES: c['x'],c['y']=POSITIONS[c['id']]
BY_ID={c['id']:c for c in CLASSES}
TABLE_TO_ID={c['table']:c['id'] for c in CLASSES if c['role']=='entity'}
ERD_REL={r['id']:r for r in ERD['relationships']}

def edge(source,target,name,points,label,kind='dependency'):
    return dict(source=source,target=target,name=name,points=points,label=label,kind=kind)

EDGES=[
    edge('customer','form','sử dụng',[(119,550),(175,550),(175,570),(230,570)],(171,528),'communication'),
    edge('form','controller','gửi yêu cầu',[(630,560),(800,560)],(715,540)),
    edge('controller','ai','gọi tư vấn',[(1040,BY_ID['controller']['y']+BY_ID['controller']['h']),(1040,1327)],(1040,1220)),
    edge('controller','account','xác định khách',[(1280,470),(1380,470),(1380,380),(1600,380)],(1475,357)),
    edge('controller','session','quản lý phiên',[(1280,510),(1320,510),(1320,195),(2470,195),(2470,230)],(2350,178)),
    edge('controller','message','lưu / đọc tin',[(1280,550),(1345,550),(1345,160),(3090,160),(3090,230)],(2900,145)),
    edge('controller','category','tra cứu danh mục',[(1280,590),(1410,590),(1410,1070),(1600,1070)],(1460,953)),
    edge('controller','product','tra cứu catalog',[(1280,630),(1435,630),(1435,900),(2470,900),(2470,1000)],(2320,879)),
    edge('controller','knowledge','đọc DA_DUYET',[(1280,670),(1460,670),(1460,930),(3090,930),(3090,1000)],(2910,912)),
    edge('controller','selection','lưu gợi ý',[(1280,710),(1350,710),(1350,1620),(2420,1620),(2420,1770)],(2290,1600)),
    edge('controller','source','lưu nguồn',[(1280,750),(1300,750),(1300,1650),(3090,1650),(3090,1770)],(2970,1630)),
]

def entity_relation(id_,name,points,label):
    original=ERD_REL[id_]
    e=edge(TABLE_TO_ID[original['source']],TABLE_TO_ID[original['target']],name,points,label,'association')
    e.update(erd_id=id_,fields=original['fields'],source_mult=original['start'].replace('N','*'),target_mult=original['end'].replace('N','*'))
    EDGES.append(e)

entity_relation('R17','sở hữu',[(2060,350),(2240,350)],(2150,327))
entity_relation('R19','chứa tin nhắn',[(2700,350),(2880,350)],(2790,327))
entity_relation('R18','người gửi',[(1830,230),(1830,125),(3130,125),(3130,230)],(2510,110))
entity_relation('R20','duyệt kiến thức',[(1830,509),(1830,760),(3470,760),(3470,1290),(3380,1290)],(2700,739))
entity_relation('R01','danh mục cha',[(1600,1110),(1530,1110),(1530,1220),(1600,1220)],(1550,1320))
entity_relation('R02','phân loại',[(2060,1130),(2240,1130)],(2150,1108))
entity_relation('R21','đề xuất',[(2990,684),(2990,850),(2770,850),(2770,1695),(2590,1695),(2590,1770)],(2770,1530))
entity_relation('R22','được gợi ý',[(2470,1454),(2470,1770)],(2470,1560))
entity_relation('R23','trích dẫn',[(3380,480),(3515,480),(3515,1880),(3380,1880)],(3470,1640))
entity_relation('R24','tham chiếu',[(3130,1404),(3130,1770)],(3130,1560))

# Mỗi association dưới đây tương ứng một thuộc tính tham chiếu thật trong mô hình phân tích.
# Bội số cạnh Controller là 0..*: một Entity có thể được nhiều ngữ cảnh đang hoạt động tham chiếu.
for i,r in enumerate(REFERENCES,1):
    relation=next(e for e in EDGES if e['source']=='controller' and e['target']==r['target'])
    relation.update(kind='controller_association',controller_id=f'C{i:02}',name=r['property'],
                    source_mult='0..*',target_mult=r['multiplicity'],reference_property=r['property'])
assert sum(e['kind']=='controller_association' for e in EDGES)==8

SELECTED=set(TABLE_TO_ID)
expected={(r['source'],r['target'],tuple(r['fields'])) for r in ERD['relationships'] if r['source'] in SELECTED and r['target'] in SELECTED}
actual={(BY_ID[e['source']]['table'],BY_ID[e['target']]['table'],tuple(e['fields'])) for e in EDGES if e['kind']=='association'}
assert actual==expected and len(actual)==10
assert len(EDGES)==21
for e in EDGES:
    for a,b in zip(e['points'],e['points'][1:]):
        assert a[0]==b[0] or a[1]==b[1]
        for c in CLASSES:
            if c['id'] in (e['source'],e['target']): continue
            x,y,w,h=(c[k] for k in ('x','y','w','h'))
            if a[0]==b[0]: crossed=x<a[0]<x+w and max(min(a[1],b[1]),y)<min(max(a[1],b[1]),y+h)
            else: crossed=y<a[1]<y+h and max(min(a[0],b[0]),x)<min(max(a[0],b[0]),x+w)
            assert not crossed,(e['name'],c['name'],a,b)

THEMES={
    'dark':dict(bg='#111417',body='#121619',text='#f8fafc',muted='#bac4cf',line='#a1aab5',assoc='#55d9b8',dep='#c3a7ee',controller_assoc='#70baff',
                headers={'boundary':'#1e2b3d','control':'#20321e','entity':'#352b0c'},borders={'boundary':'#4f7194','control':'#5f7e4d','entity':'#94772a'}),
    'light':dict(bg='#ffffff',body='#ffffff',text='#111827',muted='#64748b',line='#64748b',assoc='#087f68',dep='#7951a1',controller_assoc='#1769aa',
                 headers={'boundary':'#dbeafe','control':'#dcfce7','entity':'#fef3c7'},borders={'boundary':'#56799b','control':'#658254','entity':'#a38a42'}),
}

def build(theme):
    p=THEMES[theme]; svg=[]; count=0
    page=ET.Element('diagram',id='vopc-controller-association-'+theme,name='Controller association' if theme=='dark' else 'Controller association nền trắng')
    model=ET.SubElement(page,'mxGraphModel',dx=str(WIDTH),dy=str(HEIGHT),grid='1',gridSize='10',page='1',pageWidth=str(WIDTH),pageHeight=str(HEIGHT),pageScale='1',background=p['bg'])
    root=ET.SubElement(model,'root')
    ET.SubElement(root,'mxCell',id='0'); ET.SubElement(root,'mxCell',id='1',parent='0')
    actor_bounds={'customer':(60,500,100,150),'ai':(1000,1315,100,150)}

    def relation_color(e):
        return p['assoc'] if e['kind']=='association' else p['controller_assoc'] if e['kind']=='controller_association' else p['dep'] if e['kind']=='dependency' else p['line']

    def new_id():
        nonlocal count
        count+=1
        return 'shape_'+str(count)

    def cell(value,style,x,y,w,h,parent='1',id_=None):
        if parent in BY_ID: x,y=x-BY_ID[parent]['x'],y-BY_ID[parent]['y']
        elif parent in actor_bounds: x,y=x-actor_bounds[parent][0],y-actor_bounds[parent][1]
        node=ET.SubElement(root,'mxCell',id=id_ or new_id(),value=value,style=style,vertex='1',parent=parent)
        ET.SubElement(node,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),**{'as':'geometry'})
        return node

    def text(x,y,value,size=16,bold=False,align='start',parent='1',color=None,background=False,id_=None,max_width=None):
        color=color or p['text']; w=max(26,len(value)*size*.61+16)
        if max_width is not None: w=min(w,max_width)
        left=x-w/2 if align=='middle' else x
        if background: svg.append(f'<rect x="{left-3}" y="{y-size-3}" width="{w+6}" height="{size+8}" rx="3" fill="{p["bg"]}"/>')
        svg.append(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{700 if bold else 400}" text-anchor="{align}" fill="{color}">{escape(value)}</text>')
        style=f'text;html=0;align={"center" if align=="middle" else "left"};verticalAlign=top;spacing=0;fontSize={size};fontColor={color};fontStyle={1 if bold else 0};whiteSpace=wrap;'
        if background: style+=f'fillColor={p["bg"]};strokeColor=none;'
        return cell(value,style,left,y-size,w,size*1.6,parent,id_)

    def rect(x,y,w,h,fill,stroke,parent='1',id_=None):
        svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="1.3"/>')
        return cell('',f'rounded=0;html=0;fillColor={fill};strokeColor={stroke};container=1;collapsible=0;recursiveResize=0;',x,y,w,h,parent,id_)

    def line(pts,color=None,parent='1'):
        color=color or p['line']; points=' '.join(f'{x},{y}' for x,y in pts)
        svg.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="1.5"/>')
        node=ET.SubElement(root,'mxCell',id=new_id(),value='',style=f'edgeStyle=none;endArrow=none;startArrow=none;strokeColor={color};',edge='1',parent=parent)
        geom=ET.SubElement(node,'mxGeometry',relative='1',**{'as':'geometry'})
        dx,dy=(BY_ID[parent]['x'],BY_ID[parent]['y']) if parent in BY_ID else actor_bounds[parent][:2] if parent in actor_bounds else (0,0)
        for point,tag in [(pts[0],'sourcePoint'),(pts[-1],'targetPoint')]: ET.SubElement(geom,'mxPoint',x=str(point[0]-dx),y=str(point[1]-dy),**{'as':tag})

    svg.extend([f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title desc">',
                '<title id="title">VOPC chatbot AI: Controller giữ tham chiếu Entity bằng association có hướng</title>',
                '<desc id="desc">8 association Controller-Entity theo giả định ngữ cảnh tư vấn, 10 association Entity theo ERD, 2 dependency và một liên kết actor-form.</desc>',
                f'<rect width="{WIDTH}" height="{HEIGHT}" fill="{p["bg"]}"/>'])
    if theme=='dark':
        svg.append('<defs><pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#252c33" stroke-width="0.65"/></pattern></defs>')
        svg.append(f'<rect width="{WIDTH}" height="{HEIGHT}" fill="url(#grid)"/>')
    svg.append('<g font-family="Segoe UI, Arial, sans-serif">')
    cell('',f'rounded=0;fillColor={p["bg"]};strokeColor=none;locked=1;movable=0;resizable=0;selectable=0;connectable=0;',0,0,WIDTH,HEIGHT,id_='background')
    text(45,42,'VOPC CHATBOT AI — CONTROLLER LIÊN KẾT ENTITY BẰNG ASSOCIATION',28,True)
    text(45,75,'Giả định phân tích: một Controller giữ ngữ cảnh của một lượt tư vấn trong phiên đã mở · 8 tham chiếu Entity có lực lượng số',16,color=p['muted'])

    # Vẽ đường dưới lớp; quầng nền giúp đọc rõ tại các điểm giao.
    for e in EDGES:
        color=relation_color(e)
        points=' '.join(f'{x},{y}' for x,y in e['points']); dashed=e['kind']=='dependency'
        dash='stroke-dasharray="8 5"' if dashed else ''
        svg.append(f'<polyline points="{points}" fill="none" stroke="{p["bg"]}" stroke-width="5.5" stroke-linejoin="round"/>')
        svg.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="1.65" {dash} stroke-linejoin="round"/>')
        if e['kind'] in ('dependency','controller_association'):
            a,b=e['points'][-2:]; dx,dy=b[0]-a[0],b[1]-a[1]; n=hypot(dx,dy); ux,uy=dx/n,dy/n
            wings=[(b[0]-ux*12-uy*6,b[1]-uy*12+ux*6),b,(b[0]-ux*12+uy*6,b[1]-uy*12-ux*6)]
            svg.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in wings)+f'" fill="none" stroke="{color}" stroke-width="1.65"/>')

    for c in CLASSES:
        x,y,w,h=(c[k] for k in ('x','y','w','h')); border=p['borders'][c['role']]
        rect(x,y,w,h,p['body'],border,id_=c['id'])
        rect(x,y,w,72,p['headers'][c['role']],border,c['id'])
        text(x+w/2,y+25,'«'+c['role']+'»',15,align='middle',parent=c['id'])
        text(x+w/2,y+53,c['name'],21,True,'middle',c['id'])
        for i,attr in enumerate(c['attributes']): text(x+15,y+99+i*25,attr,16,parent=c['id'])
        sep=y+88+25*len(c['attributes']); line([(x,sep),(x+w,sep)],border,c['id'])
        for i,method in enumerate(c['methods']): text(x+15,sep+27+i*25,method,16,parent=c['id'])

    def actor(id_,x,cy,name):
        ox,oy,w,h=actor_bounds[id_]; cell('','group;container=1;collapsible=0;',ox,oy,w,h,id_=id_)
        svg.append(f'<circle cx="{x}" cy="{cy}" r="13" fill="none" stroke="{p["text"]}" stroke-width="1.5"/>')
        cell('',f'ellipse;fillColor=none;strokeColor={p["text"]};',x-13,cy-13,26,26,id_)
        for a,b in [((x,cy+13),(x,cy+54)),((x-29,cy+31),(x+29,cy+31)),((x,cy+54),(x-29,cy+80)),((x,cy+54),(x+29,cy+80))]: line([a,b],p['text'],id_)
        text(x,cy+110,name,18,True,'middle',id_)
    actor('customer',90,520,'Khách hàng')
    actor('ai',1040,1340,'Hệ thống AI')

    def mult_position(point,toward):
        dx,dy=toward[0]-point[0],toward[1]-point[1]
        if dx: return point[0]+(34 if dx>0 else -34),point[1]+24
        return point[0]+29,point[1]+(28 if dy>0 else -18)

    for i,e in enumerate(EDGES,1):
        color=relation_color(e)
        s,t=e['source'],e['target']; pts=e['points']; a,b=pts[0],pts[-1]
        sb=tuple(BY_ID[s][k] for k in ('x','y','w','h')) if s in BY_ID else actor_bounds[s]
        tb=tuple(BY_ID[t][k] for k in ('x','y','w','h')) if t in BY_ID else actor_bounds[t]
        is_dep=e['kind']=='dependency'
        directed=e['kind'] in ('dependency','controller_association')
        style=f'edgeStyle=none;rounded=0;html=0;endArrow={"open" if directed else "none"};endFill=0;startArrow=none;dashed={int(is_dep)};strokeColor={color};strokeWidth=1.65;'
        style+=f'exitX={(a[0]-sb[0])/sb[2]};exitY={(a[1]-sb[1])/sb[3]};entryX={(b[0]-tb[0])/tb[2]};entryY={(b[1]-tb[1])/tb[3]};exitPerimeter=0;entryPerimeter=0;'
        relation_id=e.get('erd_id') or e.get('controller_id') or str(i)
        edge_id='relation_'+relation_id
        node=ET.SubElement(root,'mxCell',id=edge_id,value='',style=style,edge='1',parent='1',source=s,target=t)
        geom=ET.SubElement(node,'mxGeometry',relative='1',**{'as':'geometry'})
        if len(pts)>2:
            arr=ET.SubElement(geom,'Array',**{'as':'points'})
            for x,y in pts[1:-1]: ET.SubElement(arr,'mxPoint',x=str(x),y=str(y))
        # Tên và multiplicity là nhãn riêng để có thể chỉnh vị trí trong draw.io.
        prefix=e.get('erd_id') or e.get('controller_id')
        caption=(prefix+' · ' if prefix else '')+e['name']
        cap=168 if e.get('erd_id') in ('R17','R19','R02') else None
        label_cell=text(e['label'][0],e['label'][1],caption,14,align='middle',color=color,background=True,id_='label_'+str(i),max_width=cap)
        if e['kind'] in ('association','controller_association'):
            for suffix,point,toward,value in [('start',pts[0],pts[1],e['source_mult']),('end',pts[-1],pts[-2],e['target_mult'])]:
                x,y=mult_position(point,toward)
                if e['kind']=='controller_association' and suffix=='end' and point[0]==toward[0]:
                    x=point[0]-29
                text(x,y,value,14,True,'middle',color=color,background=True,id_='mult_'+relation_id+'_'+suffix)

    text(1620,1802,'CHÚ GIẢI QUAN HỆ',18,True)
    legend=[('Liền xanh dương + mũi tên: Controller → Entity',p['controller_assoc']),
            ('Liền xanh lá: association giữa các Entity',p['assoc']),('Nét đứt tím: dependency gọi dịch vụ',p['dep']),
            ('Nét liền xám: actor tương tác với Form',p['line']),('1: đúng một; 0..1: có thể không có',p['muted']),
            ('0..*: không có hoặc có nhiều',p['muted']),('C01–C08: tham chiếu do mô hình này quy định',p['controller_assoc']),
            ('Rxx: quan hệ dữ liệu theo ERD',p['assoc']),
            ('?: thuộc tính cho phép NULL',p['muted']),('PK: khóa chính; FK: khóa ngoại',p['muted'])]
    for i,(value,color) in enumerate(legend): text(1620,1840+i*31,value,15,color=color)
    text(45,2240,'Mỗi Controller trong góc nhìn này tham chiếu 1 PhienChat, 0..1 TaiKhoan và 0..* đối tượng ở mỗi tập Entity còn lại.',16)
    text(45,2274,'Một Entity có thể được 0..* ngữ cảnh Controller tham chiếu. C01–C08 không phải các FK hay bảng mới trong database.',16)
    text(45,2310,'Giả định thiết kế phân tích; khi triển khai NestJS, đặt ngữ cảnh trong đối tượng xử lý riêng cho từng yêu cầu/phiên. Chưa thay đổi mã nguồn hoặc database.',14,color=p['muted'])
    svg.extend(['</g></svg>'])
    suffix='' if theme=='dark' else '-nen-trang'
    (ROOT/(STEM+suffix+'.svg')).write_text('\n'.join(svg),encoding='utf-8')
    return page

mxfile=ET.Element('mxfile',host='app.diagrams.net',type='device')
for theme in ('dark','light'): mxfile.append(build(theme))
ET.ElementTree(mxfile).write(ROOT/(STEM+'.drawio'),encoding='utf-8',xml_declaration=True)
(ROOT/(STEM+'.json')).write_text(json.dumps(dict(classes=CLASSES,relations=EDGES,controller_references=REFERENCES,
    assumption='Controller la ngu canh mot luot tu van trong phien da mo; khong phai singleton HTTP controller.'),ensure_ascii=False,indent=2),encoding='utf-8')

mmd=['classDiagram','    direction LR','    class KhachHang {','        <<actor>>','    }','    class HeThongAI {','        <<actor>>','    }']
for c in CLASSES:
    mmd.extend([f'    class {c["name"]} {{',f'        <<{c["role"]}>>'])
    for attr in c['attributes']: mmd.append('        +'+attr.split(' {')[0].replace('?',''))
    for method in c['methods']: mmd.append('        +'+method)
    mmd.append('    }')
names={c['id']:c['name'] for c in CLASSES}; names.update(customer='KhachHang',ai='HeThongAI')
for e in EDGES:
    s,t=names[e['source']],names[e['target']]
    if e['kind'] in ('association','controller_association'):
        arrow='-->' if e['kind']=='controller_association' else '--'
        prefix=e.get('erd_id') or e['controller_id']
        mmd.append(f'    {s} "{e["source_mult"]}" {arrow} "{e["target_mult"]}" {t} : {prefix} {e["name"]}')
    else: mmd.append(f'    {s} {"..>" if e["kind"]=="dependency" else "--"} {t} : {e["name"]}')
(ROOT/(STEM+'.mmd')).write_text('\n'.join(mmd)+'\n',encoding='utf-8')
print('Created VOPC: 8 typed Controller associations with multiplicity, 10 ERD associations, 2 dependencies; 2 pages.')
