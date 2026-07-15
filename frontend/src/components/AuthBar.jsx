// frontend/src/components/AuthBar.jsx
import React, { useState } from 'react';
import { Modal, Form, Input, Button, message, Tabs } from 'antd';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5000';

export default function AuthBar() {
  const { user, logout, login } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, values);
      if (res.data.success) {
        login(res.data.token, res.data.user);
        message.success(`Xin chào, ${res.data.user.name}!`);
        setModalOpen(false);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Đăng nhập thất bại!');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, values);
      if (res.data.success) {
        login(res.data.token, res.data.user);
        message.success(`Đăng ký thành công, chào mừng ${res.data.user.name}!`);
        setModalOpen(false);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Đăng ký thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.topBar}>
      {user ? (
        <>
          <span style={{ color: '#e9e3d2' }}>
            Xin chào, <b style={{ color: '#e6c877' }}>{user.name}</b>
          </span>
          <Button size="small" onClick={logout}>Đăng xuất</Button>
        </>
      ) : (
        <>
          <Button size="small" onClick={() => { setActiveTab('login'); setModalOpen(true); }}>
            Đăng nhập
          </Button>
          <Button size="small" type="primary" style={{ background: '#c9a24b', borderColor: '#c9a24b' }} onClick={() => { setActiveTab('register'); setModalOpen(true); }}>
            Đăng ký
          </Button>
        </>
      )}

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        title={activeTab === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}
        destroyOnClose
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'login',
              label: 'Đăng nhập',
              children: (
                <Form layout="vertical" onFinish={handleLogin}>
                  <Form.Item label="Tên đăng nhập" name="username" rules={[{ required: true, message: 'Nhập tên đăng nhập!' }]}>
                    <Input autoComplete="username" />
                  </Form.Item>
                  <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Nhập mật khẩu!' }]}>
                    <Input.Password autoComplete="current-password" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block style={{ background: '#c9a24b', borderColor: '#c9a24b' }}>
                    Đăng nhập
                  </Button>
                </Form>
              ),
            },
            {
              key: 'register',
              label: 'Đăng ký',
              children: (
                <Form layout="vertical" onFinish={handleRegister}>
                  <Form.Item label="Tên hiển thị" name="name" rules={[{ required: true, message: 'Nhập tên hiển thị!' }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Tên đăng nhập" name="username" rules={[{ required: true, message: 'Nhập tên đăng nhập!' }]}>
                    <Input autoComplete="username" />
                  </Form.Item>
                  <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Nhập mật khẩu!' }, { min: 6, message: 'Tối thiểu 6 ký tự!' }]}>
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block style={{ background: '#4c8a71', borderColor: '#4c8a71' }}>
                    Đăng ký
                  </Button>
                </Form>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}

const styles = {
  topBar: {
    position: 'absolute',
    top: '20px',
    right: '30px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    zIndex: 10,
  },
};
