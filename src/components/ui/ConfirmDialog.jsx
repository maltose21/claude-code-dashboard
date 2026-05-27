import Modal from './Modal'

export default function ConfirmDialog({ open, onClose, onConfirm, title = '确认操作', message, confirmText = '确认', danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
      <p className="text-[13px] text-gray-600 mb-6 leading-relaxed">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium">
          取消
        </button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-colors ${
            danger
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}
