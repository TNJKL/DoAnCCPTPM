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

const Select = styled.select`
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

  option {
    background-color: #40444b;
    color: #dcddde;
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

interface CreateChannelModalProps {
  onClose: () => void;
  onSubmit: (data: { name: string; type: string; description?: string }) => void;
  serverId: string;
}

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  onClose,
  onSubmit,
  serverId
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'text',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to create channel:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>Create Channel</ModalHeader>
        <ModalDescription>
          Channels are where your community can communicate about different topics.
        </ModalDescription>

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="type">Channel Type</Label>
            <Select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="text">Text Channel</option>
              <option value="voice">Voice Channel</option>
              <option value="announcement">Announcement Channel</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={formData.type === 'text' ? 'new-channel' : 'new-voice-channel'}
              value={formData.name}
              onChange={handleChange}
              required
              maxLength={100}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">Channel Description (Optional)</Label>
            <Input
              id="description"
              name="description"
              type="text"
              placeholder="What's this channel about?"
              value={formData.description}
              onChange={handleChange}
              maxLength={500}
            />
          </FormGroup>

          <ButtonGroup>
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              $variant="primary"
              disabled={!formData.name.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Channel'}
            </Button>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CreateChannelModal;
