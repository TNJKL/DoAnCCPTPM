import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuthStore } from '../../store/authStore';
import { LoginRequest } from '../../types';
// import toast from 'react-hot-toast';

const LoginContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const LoginCard = styled.div`
  background: var(--discord-bg-secondary);
  border-radius: 8px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const Title = styled.h1`
  color: var(--discord-text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 1.5rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: var(--discord-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
`;

const Input = styled.input`
  background: var(--discord-bg-tertiary);
  border: 1px solid var(--discord-bg-tertiary);
  border-radius: 4px;
  padding: 0.75rem;
  color: var(--discord-text-primary);
  font-size: 1rem;
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--discord-accent);
  }

  &::placeholder {
    color: var(--discord-text-secondary);
  }
`;

const Button = styled.button`
  background: var(--discord-accent);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #4752c4;
  }

  &:disabled {
    background: var(--discord-text-secondary);
    cursor: not-allowed;
  }
`;

const LinkText = styled.p`
  color: var(--discord-text-secondary);
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;

  a {
    color: var(--discord-accent);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const ErrorMessage = styled.div`
  color: var(--discord-danger);
  font-size: 0.875rem;
  margin-top: 0.25rem;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();
  const [formError, setFormError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    try {
      setFormError('');
      await login(data);
      navigate('/dashboard');
    } catch (error: any) {
      setFormError(error.message || 'Đăng nhập thất bại');
    }
  };

  const onSubmitForm: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Delegate to react-hook-form validation + submit
    handleSubmit(onSubmit)(e);
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Title>Đăng nhập</Title>
        <Form onSubmit={onSubmitForm} noValidate>
          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Nhập email của bạn"
              {...register('email', {
                required: 'Email là bắt buộc',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Email không hợp lệ',
                },
              })}
            />
            {errors.email && <ErrorMessage>{String(errors.email.message)}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              placeholder="Nhập mật khẩu của bạn"
              {...register('password', {
                required: 'Mật khẩu là bắt buộc',
                minLength: {
                  value: 6,
                  message: 'Mật khẩu phải có ít nhất 6 ký tự',
                },
              })}
            />
            {errors.password && <ErrorMessage>{String(errors.password.message)}</ErrorMessage>}
          </FormGroup>

          {(error || formError) && (
            <ErrorMessage>{error || formError}</ErrorMessage>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading && <LoadingSpinner />}
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </Form>

        <LinkText>
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </LinkText>
        <LinkText>
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </LinkText>
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage;
