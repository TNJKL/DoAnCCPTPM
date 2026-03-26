import React, { useState, useRef } from 'react';
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

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  background-color: #40444b;
  border: 1px solid #202225;
  border-radius: 3px;
  color: #dcddde;
  font-size: 16px;
  outline: none;
  resize: vertical;
  min-height: 80px;

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

const AvatarPreview = styled.div<{ $src?: string }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #5865f2;
  background-image: ${p => p.$src ? `url(${p.$src})` : 'none'};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px auto;
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  border: 3px solid #202225;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #5865f2;
  }
`;

const UploadArea = styled.div`
  border: 2px dashed #4f545c;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  margin-bottom: 20px;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #5865f2;
  }
`;

const UploadText = styled.div`
  color: #8e9297;
  font-size: 14px;
  margin-bottom: 4px;
`;

const UploadSubtext = styled.div`
  color: #72767d;
  font-size: 12px;
`;

const HiddenInput = styled.input`
  display: none;
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
  color: #ed4245;
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
`;

interface CreateServerModalProps {
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; avatar?: File }) => void;
}

const CreateServerModal: React.FC<CreateServerModalProps> = ({
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...formData,
        avatar: selectedFile || undefined
      });
    } catch (error: any) {
      console.error('Failed to create server:', error);
      setError(error.response?.data?.message || 'Có lỗi xảy ra khi tạo server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Chỉ hỗ trợ file JPEG, PNG, GIF và WebP');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước file quá lớn. Tối đa 5MB');
      return;
    }

    setError(null);
    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>Create Server</ModalHeader>
        <ModalDescription>
          Give your new server a personality with a name and an icon. You can always change it later.
        </ModalDescription>

        <form onSubmit={handleSubmit}>
          {/* Avatar Upload Section */}
          <AvatarPreview 
            $src={previewUrl || undefined}
            onClick={handleClickUpload}
          >
            {!previewUrl && (formData.name.charAt(0) || 'S').toUpperCase()}
          </AvatarPreview>

          <UploadArea onClick={handleClickUpload}>
            <UploadText>Nhấp để chọn avatar (tùy chọn)</UploadText>
            <UploadSubtext>JPEG, PNG, GIF, WebP • Tối đa 5MB</UploadSubtext>
          </UploadArea>

          <HiddenInput
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
          />

          {selectedFile && (
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <Button type="button" onClick={handleRemoveAvatar}>
                Xóa Avatar
              </Button>
            </div>
          )}

          <FormGroup>
            <Label htmlFor="name">Server Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Enter server name"
              value={formData.name}
              onChange={handleChange}
              required
              maxLength={100}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">Server Description (Optional)</Label>
            <TextArea
              id="description"
              name="description"
              placeholder="What's this server about?"
              value={formData.description}
              onChange={handleChange}
              maxLength={500}
            />
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <Button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              $variant="primary"
              disabled={!formData.name.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Server'}
            </Button>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CreateServerModal;
