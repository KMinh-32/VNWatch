"""Sequence ECB theo ERD VNWatch; xuất SVG và các phần tử draw.io chỉnh sửa được.

Ba interaction: mở phiên, một lượt tư vấn, transaction lưu câu trả lời.
Các thông điệp gọi Entity phải khớp phương thức trong VOPC cùng thư mục.
"""
from pathlib import Path
from html import escape
from math import hypot
import json
import textwrap
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
MODEL = json.loads((ROOT/'VNWatch-ChatbotAI-VOPC.json').read_text(encoding='utf-8'))
CLASSES = {c['id']: c for c in MODEL['classes']}
INFO = {c['id']: (c['name'], c['role'], c.get('table', '')) for c in MODEL['classes']}
INFO.update(customer=('Khách hàng', 'actor', ''), ai=('Hệ thống AI', 'actor', 'Phân hệ tư vấn'))
ALL_PAGES = []
MANIFEST = []


class Sequence:
    """Lưu bố cục theo dòng; frame lồng nhau tự tính chiều cao và nhãn điều kiện."""
    def __init__(self, stem, page_name, title, subtitle, ids, gap=330):
        self.stem, self.page_name = stem, page_name
        self.title, self.subtitle = title, subtitle
        self.ids = ids
        self.xs = {id_: 130+i*gap for i, id_ in enumerate(ids)}
        self.width = 260+(len(ids)-1)*gap
        self.y = 342
        self.items, self.frames, self.messages, self.stack, self.activations = [], [], [], [], []
        self.num = 0
        self.outstanding = {}
        self.mermaid = ['sequenceDiagram']
        for id_ in ids:
            self.mermaid.append(f'    {"actor" if INFO[id_][1]=="actor" else "participant"} {id_} as {INFO[id_][0]}')

    def msg(self, a, b, caption, reply=False, op=None, delta=None):
        assert a in self.ids and b in self.ids
        if op and b in CLASSES:
            assert op+'()' in CLASSES[b]['methods'], (self.stem, b, op)
        self.num += 1
        if a!=b:
            chars=max(18,int((abs(self.xs[a]-self.xs[b])-44)/8.4))
            caption='\n'.join(line for paragraph in caption.split('\n')
                              for line in (textwrap.wrap(paragraph,width=chars,break_long_words=False,break_on_hyphens=False) or ['']))
        self.y+=max(0,(len(caption.split('\n'))-2)*21)
        entry=dict(type='message', a=a, b=b, caption=caption, reply=reply, op=op,
                   number=self.num, y=self.y, x1=self.xs[a], x2=self.xs[b])
        self.messages.append(entry); self.items.append(entry)
        if a!=b and not reply and INFO[b][1]!='actor':
            self.outstanding[(a,b)] = self.y
        if reply and (b,a) in self.outstanding:
            start=self.outstanding.pop((b,a))
            self.activations.append((a,start,self.y))
        self.mermaid.append(f'    {a}{"-->>" if reply else "->>"}{b}: {self.num}. '+caption.replace('\n','<br/>'))
        self.y += delta or (100 if a==b else 78)
        return self.num

    def call(self,a,b,caption,op=None):
        return self.msg(a,b,caption,op=op)

    def ret(self,a,b,caption):
        return self.msg(a,b,caption,reply=True)

    def note(self,lines,first=None,last=None,kind='note'):
        if isinstance(lines,str): lines=[lines]
        left=24 if first is None else self.xs[first]-115
        right=self.width-24 if last is None else self.xs[last]+115
        height=24+len(lines)*25
        self.items.append(dict(type=kind, x=left, y=self.y-15, w=right-left, h=height, lines=lines))
        self.y += height+32
        self.mermaid.append(f'    Note over {first or self.ids[0]},{last or self.ids[-1]}: '+'<br/>'.join(lines))

    def frame(self,operator,guard,first=None,last=None):
        inset=len(self.stack)*9
        left=(20 if first is None else self.xs[first]-105)+inset
        right=(self.width-20 if last is None else self.xs[last]+105)-inset
        frame=dict(operator=operator, guard=guard, x=left, y=self.y-24, w=right-left,
                   branches=[], depth=len(self.stack))
        self.frames.append(frame); self.stack.append(frame)
        self.y += 52
        self.mermaid.append('    '+operator+' '+guard)

    def otherwise(self,guard):
        assert self.stack
        self.stack[-1]['branches'].append((self.y-20,guard))
        self.y += 58
        self.mermaid.append('    else '+guard)

    def end(self):
        frame=self.stack.pop()
        frame['h']=self.y-28-frame['y']
        self.y += 30
        self.mermaid.append('    end')

    def ref(self,caption,first,last):
        self.note(caption.split('\n'),first,last,'ref')

    def render(self,footer):
        assert not self.stack
        body_end=self.y+10
        height=int(body_end+60+len(footer)*30)
        width=self.width
        page=ET.Element('diagram',id=self.stem,name=self.page_name)
        model=ET.SubElement(page,'mxGraphModel',dx=str(width),dy=str(height),grid='1',gridSize='10',
                            page='1',pageWidth=str(width),pageHeight=str(height),pageScale='1',background='#ffffff')
        root=ET.SubElement(model,'root')
        ET.SubElement(root,'mxCell',id='0'); ET.SubElement(root,'mxCell',id='1',parent='0')
        svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title">',
             f'<title id="title">{escape(self.title)}</title>',
             f'<rect width="{width}" height="{height}" fill="white"/>',
             '<g font-family="Segoe UI, Arial, sans-serif">']
        counter=0
        bounds={f'p_{id_}': (self.xs[id_]-120,100,240,body_end-100) for id_ in self.ids}

        def uid():
            nonlocal counter
            counter+=1
            return 's'+str(counter)

        def vertex(value,style,x,y,w,h,parent='1',id_=None):
            if parent!='1':
                bx,by,_,_=bounds[parent]; x-=bx; y-=by
            el=ET.SubElement(root,'mxCell',id=id_ or uid(),value=value,style=style,vertex='1',parent=parent)
            ET.SubElement(el,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),**{'as':'geometry'})
            return el

        def text(x,y,value,size=16,bold=False,anchor='start',color='#172b43',parent='1',w=None,background=False):
            lines=value.split('\n')
            tw=w or max(40,max(len(s) for s in lines)*size*.65+24)
            left=x-tw/2 if anchor=='middle' else x
            if background:
                svg.append(f'<rect x="{left-3}" y="{y-size-2}" width="{tw+6}" height="{len(lines)*size*1.35+6}" fill="white"/>')
            for j,s in enumerate(lines):
                svg.append(f'<text x="{x}" y="{y+j*size*1.35}" font-size="{size}" font-weight="{700 if bold else 400}" text-anchor="{anchor}" fill="{color}">{escape(s)}</text>')
            style=f'text;html=0;align={"center" if anchor=="middle" else "left"};verticalAlign=top;spacing=0;whiteSpace=wrap;fontSize={size};fontStyle={int(bold)};fontColor={color};'
            if background: style+='fillColor=#ffffff;strokeColor=none;'
            return vertex(value,style,left,y-size,tw,len(lines)*size*1.35+10,parent)

        def rect(x,y,w,h,fill='none',stroke='#94a3b8',parent='1',id_=None):
            svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="1.4"/>')
            return vertex('',f'rounded=0;fillColor={fill};strokeColor={stroke};strokeWidth=1.4;',x,y,w,h,parent,id_)

        def line(points,color='#94a3b8',dash=False,parent='1',arrow=False,reply=False,id_=None,source=None,target=None):
            attr='stroke-dasharray="7 5"' if dash else ''
            pointstr=' '.join(f'{x},{y}' for x,y in points)
            svg.append(f'<polyline points="{pointstr}" fill="none" stroke="{color}" stroke-width="1.6" {attr}/>')
            if arrow:
                a,b=points[-2:]; dx,dy=b[0]-a[0],b[1]-a[1]; n=hypot(dx,dy); ux,uy=dx/n,dy/n
                wing=[(b[0]-ux*11-uy*5,b[1]-uy*11+ux*5),b,(b[0]-ux*11+uy*5,b[1]-uy*11-ux*5)]
                coords=' '.join(f'{x},{y}' for x,y in wing)
                svg.append(f'<{ "polyline" if reply else "polygon"} points="{coords}" fill="{"none" if reply else color}" stroke="{color}" stroke-width="1.6"/>')
            style=f'edgeStyle=none;rounded=0;strokeColor={color};strokeWidth=1.6;dashed={int(dash)};endArrow={"open" if arrow and reply else "block" if arrow else "none"};endFill={0 if reply else 1};startArrow=none;'
            kw={}
            if source:
                kw={'source':'p_'+source,'target':'p_'+target}
                sb,tb=bounds[kw['source']],bounds[kw['target']]
                a,b=points[0],points[-1]
                style+=f'exitX={(a[0]-sb[0])/sb[2]};exitY={(a[1]-sb[1])/sb[3]};entryX={(b[0]-tb[0])/tb[2]};entryY={(b[1]-tb[1])/tb[3]};exitPerimeter=0;entryPerimeter=0;'
            cell=ET.SubElement(root,'mxCell',id=id_ or uid(),value='',style=style,edge='1',parent=parent,**kw)
            geo=ET.SubElement(cell,'mxGeometry',relative='1',**{'as':'geometry'})
            ox,oy=bounds[parent][:2] if parent!='1' else (0,0)
            for (x,y),key in [(points[0],'sourcePoint'),(points[-1],'targetPoint')]:
                ET.SubElement(geo,'mxPoint',x=str(x-ox),y=str(y-oy),**{'as':key})
            if len(points)>2:
                arr=ET.SubElement(geo,'Array',**{'as':'points'})
                for x,y in points[1:-1]: ET.SubElement(arr,'mxPoint',x=str(x-ox),y=str(y-oy))

        def circle(x,y,r,fill,parent):
            svg.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="#64748b" stroke-width="1.6"/>')
            vertex('',f'ellipse;fillColor={fill};strokeColor=#64748b;',x-r,y-r,r*2,r*2,parent)

        text(28,40,self.title,25,True)
        text(28,74,self.subtitle,16,color='#52677d')
        for id_ in self.ids:
            x=self.xs[id_]; name,role,table=INFO[id_]; group='p_'+id_
            vertex('','group;container=1;collapsible=0;recursiveResize=0;',*bounds[group],id_=group)
            if role=='actor':
                circle(x,130,13,'white',group)
                for a,b in [((x,143),(x,182)),((x-27,159),(x+27,159)),((x,182),(x-27,211)),((x,182),(x+27,211))]: line([a,b],parent=group)
            else:
                circle(x,158,27,{'boundary':'#dbeafe','control':'#d5e8d4','entity':'#fff2cc'}[role],group)
                if role=='boundary':
                    line([(x-41,135),(x-41,181)],parent=group)
                    line([(x-41,158),(x-27,158)],parent=group)
                elif role=='control':
                    line([(x+20,137),(x+4,123),(x-14,130)],parent=group)
                    line([(x-4,120),(x-14,130),(x-2,134)],parent=group)
                else: line([(x-30,189),(x+30,189)],parent=group)
            text(x,241,name,19,True,'middle',parent=group,w=250)
            text(x,266,'«'+role+'»'+(' · '+table if table else ''),12,anchor='middle',color='#64748b',parent=group,w=280)
            line([(x,286),(x,body_end)],dash=True,parent=group)

        # Không dùng critical để giả làm transaction: frame chỉ là alt/opt/break đúng nghĩa UML.
        frame_labels=[]
        for f in self.frames:
            x,y,w,h=(f[k] for k in ('x','y','w','h'))
            color='#b14a55' if f['operator']=='break' else '#7589a0'
            rect(x,y,w,h,stroke=color)
            rect(x,y,80,29,'#fff1f2' if f['operator']=='break' else '#edf3f8',color)
            frame_labels.append((x+40,y+21,f['operator'],True,'middle',color,70))
            frame_labels.append((x+96,y+22,'['+f['guard']+']',False,'start',color,None))
            for by,guard in f['branches']:
                line([(x,by),(x+w,by)],color,dash=True)
                frame_labels.append((x+16,by+26,'['+guard+']',False,'start',color,None))

        # Controller là execution của interaction; Entity chỉ hoạt động trong lời gọi của nó.
        if 'controller' in self.ids:
            x=self.xs['controller']; rect(x-6,320,12,body_end-320,'#f1f5f9','#94a3b8',parent='p_controller')
        for id_,start,end in self.activations:
            if id_=='controller': continue
            rect(self.xs[id_]-6,start,12,end-start+5,'#f8fafc','#94a3b8',parent='p_'+id_)

        # Nhãn điều kiện nằm trên lifeline / activation để không mất chữ ở chỗ giao nhau.
        for x,y,label,bold,anchor,color,w in frame_labels:
            text(x,y,label,15,bold,anchor,color,w=w,background=not bold)

        for item in self.items:
            if item['type']!='message':
                x,y,w,h=(item[k] for k in ('x','y','w','h'))
                is_ref=item['type']=='ref'
                rect(x,y,w,h,'#eff6ff' if is_ref else '#fffbeb','#7da2c7' if is_ref else '#c4ae69')
                inset=65 if is_ref else 15
                if is_ref: text(x+12,y+24,'ref',16,True)
                for j,s in enumerate(item['lines']): text(x+inset,y+26+j*25,s,15)
                continue
            m=item; a,b=m['a'],m['b']; x1,x2=m['x1'],m['x2']; y=m['y']
            if x1<x2: start,end=(x1+6,y),(x2-6,y)
            elif x1>x2: start,end=(x1-6,y),(x2+6,y)
            else: start,end=(x1+6,y),(x2+6,y+30)
            pts=[start,end] if a!=b else [start,(x1+95,y),(x1+95,y+30),end]
            line(pts,'#22354b',m['reply'],arrow=True,reply=m['reply'],id_='message_'+str(m['number']),source=a,target=b)
            caption=f'{m["number"]}. '+m['caption']
            if a==b:
                text(x1+112,y-8,caption,15,w=max(500,len(caption)*9.7),background=True)
            else:
                # Đặt toàn bộ nhãn nhiều dòng phía trên mũi tên, không đè lên đường nối.
                text((start[0]+end[0])/2,y-14-(len(caption.split('\n'))-1)*20.25,
                     caption,15,anchor='middle',w=max(abs(end[0]-start[0])-16,180),background=True)

        rect(22,body_end+20,width-44,len(footer)*30+20,'#f8fafc','#cbd5e1')
        for j,s in enumerate(footer): text(38,body_end+46+j*30,s,14,color='#475569')
        svg.append('</g></svg>')
        (ROOT/(self.stem+'.svg')).write_text('\n'.join(svg),encoding='utf-8')
        (ROOT/(self.stem+'.mmd')).write_text('\n'.join(self.mermaid)+'\n',encoding='utf-8')
        mxfile=ET.Element('mxfile',host='app.diagrams.net',type='device'); mxfile.append(page)
        ET.ElementTree(mxfile).write(ROOT/(self.stem+'.drawio'),encoding='utf-8',xml_declaration=True)
        ALL_PAGES.append(page)
        MANIFEST.append(dict(stem=self.stem,participants=self.ids,messages=self.messages,frames=self.frames,
                             width=width,height=height))


s=Sequence('VNWatch-ChatbotAI-Sequence-01-MoPhien','02 Sequence — mở phiên',
           'SEQUENCE 01 — MỞ CHATBOT / TIẾP TỤC PHIÊN',
           'sd MoPhienChat · xác định khách từ ngữ cảnh backend; chỉ tải hội thoại sau khi kiểm tra quyền',
           ['customer','form','controller','account','session','message','product','selection','source'])
s.note(['Khách chưa đăng nhập được tư vấn: MaTK = NULL. MaTK không lấy từ nội dung do trình duyệt gửi.',
        'Phiên khách dùng token do backend ký, gắn với MaPhien; MaPhien đơn lẻ không chứng minh quyền sở hữu.'])
s.call('customer','form','Mở cửa sổ\nchatbot',op='moChatbot')
s.call('form','controller','moPhienChat\n(MaPhien?)',op='moPhienChat')
s.frame('opt','Có ngữ cảnh đăng nhập')
s.call('controller','account','layThongTinKhach(MaTK từ ngữ cảnh)',op='layThongTinKhach')
s.ret('account','controller','Thông tin tối thiểu và trạng thái tài khoản')
s.end()
s.frame('break','Thông tin xác thực không hợp lệ hoặc tài khoản bị khóa')
s.ret('controller','form','Yêu cầu xác thực lại;\nkhông tải lịch sử')
s.ret('form','customer','Hiển thị thông báo')
s.end()
s.frame('alt','Chưa có MaPhien')
s.call('controller','session','taoPhien(MaTK hoặc NULL)',op='taoPhien')
s.ret('session','controller','Phiên mới: MaPhien, trạng thái mở')
s.note('Backend cấp thông tin truy cập phiên khách; lịch sử của phiên mới là danh sách rỗng.','controller','session')
s.otherwise('Có MaPhien cần tiếp tục')
s.call('controller','session','layPhien(MaPhien)',op='layPhien')
s.ret('session','controller','phien hoặc không tồn tại')
s.end()
s.call('controller','controller','kiemTraQuyenPhien(phien, ngữ cảnh xác thực / token khách)',op='kiemTraQuyenPhien')
s.frame('break','Phiên không tồn tại, không thuộc khách hoặc đã đóng')
s.ret('controller','form','Từ chối truy cập phiên')
s.ret('form','customer','Thông báo; cho phép\nmở phiên mới')
s.end()
s.frame('opt','Tiếp tục phiên đã có: tải lịch sử và dữ liệu hiển thị')
s.call('controller','message','layLichSuPhien(MaPhien)',op='layLichSuPhien')
s.ret('message','controller','Tin nhắn theo thời gian; dsMaTN của các trả lời')
s.call('controller','selection','layDanhSachGoiY(dsMaTN)',op='layDanhSachGoiY')
s.ret('selection','controller','Các liên kết MaTN–MaSP, thứ tự và lý do')
s.call('controller','source','layNguonTheoTinNhan(dsMaTN)',op='layNguonTheoTinNhan')
s.ret('source','controller','Nguồn và bản chụp nội dung đã dùng')
s.frame('opt','Lịch sử có sản phẩm gợi ý')
s.call('controller','product','layThongTinSanPham(dsMaSP)',op='layThongTinSanPham')
s.ret('product','controller','Thông tin công khai hiện tại; báo sản phẩm đã ngừng bán nếu có')
s.end()
s.end()
s.ret('controller','form','MaPhien, lịch sử,\ngợi ý và nguồn')
s.ret('form','customer','Hiển thị lời chào\nhoặc hội thoại cũ')
s.render(['Entity trên sơ đồ là lớp phân tích ánh xạ bảng ERD; các phương thức được thực hiện qua tầng truy cập dữ liệu.',
          'Lỗi truy vấn: kết thúc thao tác và báo không tải được hội thoại; không trả dữ liệu một phần như kết quả thành công.',
          'Đóng cửa sổ chỉ ẩn giao diện; việc kết thúc PhienChat là thao tác riêng. Tiếp tục hỏi đáp ở Sequence 02.'])

s=Sequence('VNWatch-ChatbotAI-Sequence-02-TuVan','03 Sequence — tư vấn',
           'SEQUENCE 02 — MỘT LƯỢT CHATBOT AI TƯ VẤN KHÁCH HÀNG',
           'sd XuLyCauHoi · tiền điều kiện: đã mở phiên bằng Sequence 01 · đủ 8 Entity, cùng tên với VOPC',
           ['customer','form','controller','account','session','message','category','product','knowledge','selection','source','ai'],gap=350)
s.note(['Phạm vi: tư vấn đồng hồ, thương hiệu, chính sách và thông tin công khai của website.',
        'Chatbot không đặt hàng, sửa tồn kho hoặc đọc đơn hàng cá nhân trong use case này; thao tác mua hàng yêu cầu đăng nhập.'])
s.call('customer','form','Nhập câu hỏi\nvà nhấn Gửi',op='guiCauHoi')
s.call('form','controller','xuLyCauHoi\n(MaPhien, NoiDung)',op='xuLyCauHoi')
s.call('controller','controller','kiemTraDuLieuDauVao(NoiDung, giới hạn tần suất)',op='kiemTraDuLieuDauVao')
s.frame('break','Câu hỏi rỗng / vượt giới hạn / gửi quá nhanh')
s.ret('controller','form','Thông báo dữ liệu\nkhông hợp lệ')
s.ret('form','customer','Yêu cầu điều chỉnh\ncâu hỏi / gửi lại sau')
s.end()
s.frame('opt','Khách đã đăng nhập')
s.call('controller','account','layThongTinKhach(MaTK từ ngữ cảnh)',op='layThongTinKhach')
s.ret('account','controller','Danh tính và trạng thái tài khoản hiện tại')
s.end()
s.call('controller','session','layPhien(MaPhien)',op='layPhien')
s.ret('session','controller','phien, MaTK chủ phiên, TrangThai')
s.call('controller','controller','kiemTraQuyenPhien(phien, ngữ cảnh xác thực / token khách)',op='kiemTraQuyenPhien')
s.frame('break','Không đủ quyền / tài khoản bị khóa / phiên đã đóng hoặc không tồn tại')
s.ret('controller','form','Từ chối xử lý;\nkhông ghi tin nhắn')
s.ret('form','customer','Thông báo lỗi\ntruy cập phiên')
s.end()
s.call('controller','message','luuTinKhach(MaPhien, MaTK?, NoiDung, NguoiGui=KHACH_HANG)',op='luuTinKhach')
s.ret('message','controller','MaTNKhach')
s.call('controller','message','layLichSuTruoc(MaPhien, MaTNKhach)',op='layLichSuTruoc')
s.ret('message','controller','Lịch sử trước câu hỏi này; giới hạn số lượt / độ dài')
s.call('controller','controller','xacDinhYDinh(NoiDung, lichSu) → chủ đề, tiêu chí, phạm vi',op='xacDinhYDinh')
s.frame('alt','Câu hỏi ngoài phạm vi website')
s.call('controller','controller','taoTraLoiDuPhong(ngoài phạm vi): hướng dẫn chủ đề hỗ trợ',op='taoTraLoiDuPhong')
s.otherwise('Câu hỏi thuộc phạm vi website')
s.frame('opt','Cần tìm / so sánh / hỏi thông tin sản phẩm')
s.call('controller','category','layDanhMucLienQuan(tieuChi)',op='layDanhMucLienQuan')
s.ret('category','controller','Danh mục liên quan, gồm danh mục con nếu cần')
s.call('controller','product','timSanPhamLienQuan(tieuChi, dsMaDM, sản phẩm công khai)',op='timSanPhamLienQuan')
s.ret('product','controller','Catalog: MaSP, thương hiệu, giá, tồn kho, thông số, ảnh')
s.end()
s.call('controller','knowledge','layKienThucDaDuyet(chuDe, TrangThai=DA_DUYET)',op='layKienThucDaDuyet')
s.ret('knowledge','controller','Kiến thức liên quan và nguồn: MaKT, nội dung, URLNguon')
s.frame('alt','Không có dữ liệu đủ để trả lời')
s.call('controller','controller','taoTraLoiDuPhong(thiếu dữ liệu): hỏi rõ hơn / báo chưa có thông tin',op='taoTraLoiDuPhong')
s.otherwise('Có catalog hoặc kiến thức liên quan')
s.call('controller','ai','tuVan(cauHoi, lichSu, catalog, kienThucDaDuyet) — chỉ dữ liệu cần cho câu trả lời')
s.ret('ai','controller','Kết quả có cấu trúc / lỗi / timeout: nội dung, MaSP gợi ý, nguồn, YDinh, CheDo, TenMoHinh?')
s.call('controller','controller','kiemTraKetQua(): đối chiếu sản phẩm, giá / tồn, nguồn với dữ liệu đã cung cấp',op='kiemTraKetQua')
s.frame('opt','AI không cấu hình / lỗi / quá hạn / kết quả không hợp lệ')
s.call('controller','controller','taoTraLoiDuPhong(catalog, kienThucDaDuyet); CheDo=CATALOG, TenMoHinh=NULL',op='taoTraLoiDuPhong')
s.end()
s.end()
s.end()
s.note(['Chỉ gợi ý mua sản phẩm đang bán và còn hàng; câu hỏi về sản phẩm hết hàng vẫn được trả lời đúng tình trạng.',
        'Nguồn chỉ thuộc dữ liệu đã tra cứu. Không gửi mật khẩu, email, số điện thoại hoặc dữ liệu đơn hàng cho AI.'], 'controller','ai')
s.ref('Sequence 03 — luuKetQuaTuVan(MaPhien, ketQua)\nLưu TinNhanChat AI + SanPhamGoiY + NguonTraLoi + cập nhật PhienChat trong một transaction.\nTrả về: commit thành công và MaTNAI, hoặc lỗi lưu.', 'controller','source')
s.frame('alt','Transaction đã COMMIT thành công')
s.ret('controller','form','Câu trả lời, gợi ý, nguồn,\nMaTNAI và chế độ tư vấn')
s.ret('form','customer','Hiển thị trả lời,\nsản phẩm và nguồn')
s.otherwise('Lưu kết quả thất bại')
s.ret('controller','form','Báo chưa lưu được\nkết quả tư vấn')
s.ret('form','customer','Thông báo lỗi;\ncho phép thử lại')
s.end()
s.render(['Mỗi lần gửi câu hỏi chạy một interaction này; kiểm tra quyền được lặp lại, không chỉ kiểm tra lúc mở cửa sổ.',
          'Tin khách và câu hỏi hiện tại không bị đưa vào prompt hai lần. AI là phân hệ tư vấn, không có đường truy cập trực tiếp các Entity.',
          'Lỗi đọc dữ liệu / lưu câu hỏi dừng xử lý và báo lỗi; không coi lỗi truy vấn là catalog rỗng để AI tự suy diễn.',
          'Bản thiết kế theo ERD gộp. Sequence 03 giải thích chi tiết phần lưu; không dùng ký hiệu critical để thay cho giao dịch database.'])

s=Sequence('VNWatch-ChatbotAI-Sequence-03-LuuKetQua','04 Sequence — lưu kết quả',
           'SEQUENCE 03 — LƯU KẾT QUẢ TƯ VẤN NHẤT QUÁN',
           'sd LuuKetQuaTuVan · được gọi từ ref của Sequence 02 · dùng chung transaction context cho các thao tác ghi',
           ['controller','session','message','selection','source'],gap=440)
s.note(['Đầu vào: MaPhien đã kiểm tra quyền, ketQua đã đối chiếu với catalog / kiến thức được duyệt.',
        'Tin khách đã được lưu ở Sequence 02. Transaction dưới đây chỉ bao gồm tin AI, gợi ý, nguồn và cập nhật phiên.'])
s.call('controller','controller','batDauGiaoDich() — BEGIN',op='batDauGiaoDich')
s.call('controller','message','luuTinAI(MaPhien, NguoiGui=AI, MaTK=NULL, ketQua, TrangThai=HOAN_TAT)',op='luuTinAI')
s.ret('message','controller','MaTNAI mới hoặc lỗi ghi')
s.frame('break','Ghi tin AI thất bại')
s.call('controller','controller','rollbackGiaoDich(); trả lỗi lưu cho interaction gọi',op='rollbackGiaoDich')
s.end()
s.frame('opt','Có sản phẩm gợi ý')
s.call('controller','selection','luuDanhSachGoiY(MaTNAI, [(MaSP, ThuTu, LyDo)])',op='luuDanhSachGoiY')
s.ret('selection','controller','Kết quả ghi SanPhamGoiY hoặc lỗi')
s.end()
s.frame('break','Ghi sản phẩm gợi ý thất bại')
s.call('controller','controller','rollbackGiaoDich(); trả lỗi lưu cho interaction gọi',op='rollbackGiaoDich')
s.end()
s.frame('opt','Có nguồn trả lời')
s.call('controller','source','luuNguonVaBanChup(MaTNAI, [(MaKT?, TieuDeNguon, URLNguon?, NoiDungTrichDan?, ThoiDiemSuDung)])',op='luuNguonVaBanChup')
s.ret('source','controller','Kết quả ghi nguồn và bản chụp hoặc lỗi')
s.end()
s.frame('break','Ghi nguồn trả lời thất bại')
s.call('controller','controller','rollbackGiaoDich(); trả lỗi lưu cho interaction gọi',op='rollbackGiaoDich')
s.end()
s.call('controller','session','capNhatThoiGian(MaPhien)',op='capNhatThoiGian')
s.ret('session','controller','Kết quả cập nhật NgayCapNhat hoặc lỗi')
s.frame('break','Cập nhật phiên thất bại')
s.call('controller','controller','rollbackGiaoDich(); trả lỗi lưu cho interaction gọi',op='rollbackGiaoDich')
s.end()
s.call('controller','controller','commitGiaoDich() — COMMIT',op='commitGiaoDich')
s.frame('break','Database báo COMMIT thất bại')
s.call('controller','controller','rollbackGiaoDich(); trả lỗi lưu cho interaction gọi',op='rollbackGiaoDich')
s.end()
s.note('Trả thành công và MaTNAI cho interaction gọi; Sequence 02 mới trả kết quả về giao diện.')
s.render(['SanPhamGoiY: PK(MaTN, MaSP), ThuTu > 0; mỗi MaTN không trùng ThuTu. MaTN ở đây luôn là MaTNAI.',
          'NguonTraLoi.MaKT có thể NULL với nguồn trang sản phẩm; giữ tiêu đề, URL và bản chụp nội dung theo ERD.',
          'Tin AI có MaTK=NULL. CheDo và TenMoHinh lưu cùng TinNhanChat; không phải một bảng nhà cung cấp AI.',
          'Mỗi break kết thúc toàn bộ interaction này: rollback các thay đổi trong transaction; tin khách trước đó vẫn giữ.',
          'Nếu BEGIN thất bại thì trả lỗi ngay. Không giữ transaction mở trong thời gian chờ AI ở Sequence 02.'])

# Gộp các trang vào một file thuận tiện để người học sửa và xuất báo cáo.
bundle=ET.Element('mxfile',host='app.diagrams.net',type='device')
vopc=ET.parse(ROOT/'VNWatch-ChatbotAI-VOPC.drawio').getroot()
bundle.append(vopc.find("diagram[@id='vopc-light']"))
for page in ALL_PAGES: bundle.append(page)
bundle.append(vopc.find("diagram[@id='vopc-dark']"))
ET.ElementTree(bundle).write(ROOT/'VNWatch-ChatbotAI-VOPC-Sequence.drawio',encoding='utf-8',xml_declaration=True)
seq_bundle=ET.Element('mxfile',host='app.diagrams.net',type='device')
for page in ALL_PAGES: seq_bundle.append(page)
ET.ElementTree(seq_bundle).write(ROOT/'VNWatch-ChatbotAI-Sequence.drawio',encoding='utf-8',xml_declaration=True)
(ROOT/'sequence-manifest.json').write_text(json.dumps(MANIFEST,ensure_ascii=False,indent=2),encoding='utf-8')

# Đối chiếu độ bao phủ: tên Entity, chiều lời gọi và phương thức khớp VOPC.
expected={id_ for id_,c in CLASSES.items() if c['role']=='entity'}
used={m['b'] for page in MANIFEST for m in page['messages'] if not m['reply'] and m['b'] in expected}
assert used==expected, (used,expected)
deps={(e['source'],e['target']) for e in MODEL['relations'] if e['kind']=='dependency'}
for page in MANIFEST:
    for m in page['messages']:
        if not m['reply'] and m['a']=='controller' and m['b']!='controller':
            assert ('controller',m['b']) in deps
assert len(bundle.findall('diagram'))==5
print('Created 3 sequence interactions; 8 entities covered; VOPC/sequence operations match; combined drawio has 5 pages.')
