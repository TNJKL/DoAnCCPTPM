import React, { useState } from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: #36393f;
  border-radius: 8px;
  padding: 24px;
  width: 440px;
  max-width: 90vw;
  color: #dcddde;
`;

const ModalHeader = styled.h2`
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: bold;
  color: #fff;
`;

const ModalDescription = styled.p`
  margin: 0 0 20px 0;
  color: #8e9297;
  font-size: 16px;
  line-height: 1.375;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #8e9297;
  text-transform: uppercase;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  background-color: #40444b;
  border: 1px solid #202225;
  border-radius: 3px;
  color: #dcddde;
  font-size: 16px;
  outline: none;

  &:focus {
    border-color: #5865f2;
  }

  &::placeholder {
    color: #72767d;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 10px 16px;
  border-radius: 3px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  outline: none;
  transition: background-color 0.2s ease;

  ${props => props.$variant === 'primary' ? `
    background-color: #5865f2;
    color: #fff;
    
    &:hover {
      background-color: #4752c4;
    }
    
    &:disabled {
      background-color: #4f545c;
      cursor: not-allowed;
    }
  ` : `
    background-color: transparent;
    color: #8e9297;
    
    &:hover {
      color: #dcddde;
    }
  `}
`;

const ErrorMessage = styled.div`
  color: #f04747;
  font-size: 14px;
  margin-top: 8px;
`;

const SuccessMessage = styled.div`
  color: #3ba55c;
  font-size: 14px;
  margin-top: 8px;
`;

interface AddFriendModalProps {
  onClose: () => void;
  onSendRequest: (username: string) => Promise<void>;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({
  onClose,
  onSendRequest
}) => {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      await onSendRequest(username.trim());
      setSuccess('Friend request sent successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to send friend request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setError(''); // Clear error when user types
    setSuccess(''); // Clear success message
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>Add Friend</ModalHeader>
        <ModalDescription>
          You can add a friend with their Discord username. It's cAsE sEnSiTiVe!
        </ModalDescription>

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Enter a username#0000"
              value={username}
              onChange={handleChange}
              required
              maxLength={50}
            />
            {error && <ErrorMessage>{error}</ErrorMessage>}
            {success && <SuccessMessage>{success}</SuccessMessage>}
          </FormGroup>

          <ButtonGroup>
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              $variant="primary"
              disabled={!username.trim() || isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Friend Request'}
            </Button>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default AddFriendModal;
