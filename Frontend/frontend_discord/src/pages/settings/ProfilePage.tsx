import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/api.service';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Page = styled.div`
  display: flex;
  padding: 24px;
  gap: 24px;
  color: #dcddde;
`;

const Card = styled.div`
  background: #2f3136;
  border: 1px solid #202225;
  border-radius: 8px;
  padding: 16px;
  width: 100%;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
`;

const Label = styled.div`
  width: 160px;
  color: #b9bbbe;
`;

const Input = styled.input`
  flex: 1;
  background: #202225;
  border: 1px solid #2b2d31;
  color: #fff;
  border-radius: 6px;
  padding: 10px 12px;
`;

const ReadonlyInput = styled(Input)`
  opacity: 0.85;
`;

const AvatarPreview = styled.div<{ $src?: string }>`
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: #5865f2;
  background-image: ${p => p.$src ? `url(${p.$src})` : 'none'};
  background-size: cover;
  background-position: center;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 800;
`;

const Primary = styled.button`
  background: #5865f2;
  color: #fff;
  border: none;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
`;
const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
`;

const Tab = styled(Link)<{ $active?: boolean }>`
  padding: 8px 12px;
  border-radius: 6px;
  color: ${p => (p.$active ? '#fff' : '#b9bbbe')};
  background: ${p => (p.$active ? '#3a3c41' : 'transparent')};
  cursor: pointer;
  text-decoration: none;
`;

const Ghost = styled.button`
  background: transparent;
  color: #b9bbbe;
  border: 1px solid #3a3c41;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
`;

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [bio, setBio] = useState(user?.bio || '');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | undefined>(user?.avatar_url);
  const [saving, setSaving] = useState(false);
  const [lock, setLock] = useState<{[k:string]: boolean}>({});

  const onSave = async () => {
    setSaving(true);
    let avatar_url = user?.avatar_url;
    const file = fileRef.current?.files?.[0];
    if (file) {
      const uploaded = await apiService.uploadFile(file);
      avatar_url = uploaded.file_url;
    }
    try {
      await updateProfile({ 
        display_name: displayName, 
        username,
        email, 
        phone_number: phone, 
        bio, 
        avatar_url 
      });
      toast.success('Đã lưu thay đổi hồ sơ');
      window.history.back();
    } catch (e:any) {
      toast.error(e?.response?.data?.message || 'Lưu thay đổi thất bại');
    }
    setSaving(false);
  };

  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Page>
      <Card>
        <div style={{display:'flex', gap:16, marginBottom:16}}>
          <Ghost onClick={()=>navigate(-1)}>← Quay lại</Ghost>
          <div style={{color:'#fff', fontWeight:700}}>Cài đặt</div>
          <div style={{color:'#b9bbbe'}}> • </div>
          <div style={{color:'#b9bbbe'}}>Hồ sơ</div>
          <div style={{flex:1}} />
          <Ghost onClick={()=>navigate('/dashboard')}>Thoát</Ghost>
        </div>
        <Tabs>
          <Tab to="/settings/account" $active={location.pathname.includes('/settings/account')}> Tài khoản </Tab>
          <Tab to="/settings/profile" $active={location.pathname.includes('/settings/profile')}> Hồ sơ </Tab>
        </Tabs>
        <h2 style={{marginTop:0, color:'#fff'}}>Hồ sơ</h2>
        <Row>
          <Label>Tên hiển thị</Label>
          <Input value={displayName} onChange={e=>setDisplayName(e.target.value)} />
        </Row>
        <Row>
          <Label>Tên đăng nhập</Label>
          <Input value={username} onChange={e=>setUsername(e.target.value)} />
        </Row>
        <Row>
          <Label>Email</Label>
          <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        </Row>
        <Row>
          <Label>Số Điện Thoại</Label>
          <Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Nhập số điện thoại" />
        </Row>
        <Row>
          <Label>Tiểu sử</Label>
          <Input value={bio} onChange={e=>setBio(e.target.value)} placeholder="Giới thiệu ngắn..." />
        </Row>
        <Row>
          <Label>Ảnh đại diện</Label>
          <div style={{display:'flex', alignItems:'center', gap:16}}>
            <AvatarPreview $src={preview}>{!preview && (user?.display_name?.[0] || user?.username?.[0] || 'U')}</AvatarPreview>
            <input ref={fileRef} type="file" accept="image/*" onChange={(e)=>{
              const f = e.target.files?.[0];
              if (f) {
                const url = URL.createObjectURL(f);
                setPreview(url);
              }
            }} />
          </div>
        </Row>
        <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
          <Ghost onClick={()=>window.history.back()}>Hủy</Ghost>
          <Primary onClick={onSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Primary>
        </div>
      </Card>
    </Page>
  );
};

export default ProfilePage;