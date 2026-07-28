import toast from 'react-hot-toast'

export function notifySuccess(message: string): void {
  toast.success(message)
}

export function notifyError(message: string): void {
  toast.error(message)
}

export function notifyInfo(message: string): void {
  toast(message, {
    icon: 'ℹ️',
  })
}
