import Modal from './Modal';

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  variant = "danger" 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
  confirmText?: string; 
  variant?: "danger" | "primary";
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-sm text-[#8C8C8C] leading-relaxed mb-6">{message}</p>
      <div className="flex justify-end items-center gap-3">
        <button 
          onClick={onClose} 
          className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] rounded-xl text-xs font-medium text-[#ECECEC] transition-all duration-150 active:scale-[0.98]"
        >
          Cancel
        </button>
        <button 
          onClick={() => { onConfirm(); onClose(); }} 
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
            variant === 'danger' 
              ? 'bg-[#1A1A1A] hover:bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30' 
              : 'bg-white hover:bg-neutral-200 text-[#0A0A0A]'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
