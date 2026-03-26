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

interface JoinServerModalProps {
  onClose: () => void;
  onJoinServer: (inviteCode: string) => Promise<void>;
}

const JoinServerModal: React.FC<JoinServerModalProps> = ({
  onClose,
  onJoinServer
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || isJoining) return;

    setIsJoining(true);
    setError('');
    
    try {
      await onJoinServer(inviteCode.trim());
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to join server');
    } finally {
      setIsJoining(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInviteCode(e.target.value);
    setError(''); // Clear error when user types
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>Join a Server</ModalHeader>
        <ModalDescription>
          Enter an invite code below to join an existing server.
        </ModalDescription>

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              name="inviteCode"
              type="text"
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={handleChange}
              required
              maxLength={20}
            />
            {error && <ErrorMessage>{error}</ErrorMessage>}
          </FormGroup>

          <ButtonGroup>
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              $variant="primary"
              disabled={!inviteCode.trim() || isJoining}
            >
              {isJoining ? 'Joining...' : 'Join Server'}
            </Button>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default JoinServerModal;
