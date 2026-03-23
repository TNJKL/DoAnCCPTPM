import React, { useState } from 'react';
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

const Primary = styled.button`
  background: #5865f2;
  color: #fff;
  border: none;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
`;

const Ghost = styled.button`
  background: transparent;
  color: #b9bbbe;
  border: 1px solid #3a3c41;
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

const AccountPage: React.FC = () => {
  const { user, updateProfile } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const saveAccount = async () => {
    setSaving(true);
    try {
      await updateProfile({ username, email, phone_number: phone });
      // Đổi mật khẩu nếu người dùng nhập cả 2 trường
      if (currentPwd && newPwd) {
        await apiService.changePassword(currentPwd, newPwd);
        setCurrentPwd('');
        setNewPwd('');
      }
      toast.success('Đã lưu thay đổi');
    } catch (e:any) {
      toast.error(e?.response?.data?.message || 'Lưu thất bại');
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
          <div style={{color:'#b9bbbe'}}>Tài khoản</div>
          <div style={{flex:1}} />
          <Ghost onClick={()=>navigate('/dashboard')}>Thoát</Ghost>
        </div>

        <Tabs>
          <Tab to="/settings/account" $active={location.pathname.includes('/settings/account')}> Tài khoản </Tab>
          <Tab to="/settings/profile" $active={location.pathname.includes('/settings/profile')}> Hồ sơ </Tab>
        </Tabs>

        <h2 style={{marginTop:0, color:'#fff'}}>Thông tin tài khoản</h2>
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
        {/* Bỏ đường phân cách để khối mật khẩu liền mạch */}
        <Row>
          <Label>Mật khẩu hiện tại</Label>
          <Input type="password" value={currentPwd} onChange={e=>setCurrentPwd(e.target.value)} />
        </Row>
        <Row>
          <Label>Mật khẩu mới</Label>
          <Input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} />
        </Row>
        <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
          <Ghost onClick={()=>navigate(-1)}>Hủy</Ghost>
          <Primary onClick={saveAccount} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Primary>
        </div>
      </Card>
    </Page>
  );
};

export default AccountPage;


