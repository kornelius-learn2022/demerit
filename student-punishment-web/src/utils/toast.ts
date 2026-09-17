type ToastType = 'success' | 'error' | 'info'

export function showToast(message: string, type: ToastType = 'success', duration = 3000): void {
  const existing = document.getElementById('toast-container')
  const container = existing ?? createContainer()

  const toast = document.createElement('div')

  const colorClasses: Record<ToastType, string> = {
    success: 'bg-green-500',
    error:   'bg-red-500',
    info:    'bg-blue-500',
  }

  const iconMap: Record<ToastType, string> = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`,
    error:   `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
    info:    `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
  }

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm max-w-sm w-full transition-all duration-300 opacity-0 translate-y-2 ${colorClasses[type]}`
  toast.innerHTML = `${iconMap[type]}<span class="flex-1">${message}</span>`

  container.appendChild(toast)

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', 'translate-y-2')
    })
  })

  // Remove after duration
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2')
    setTimeout(() => {
      toast.remove()
      if (container.children.length === 0) {
        container.remove()
      }
    }, 300)
  }, duration)
}

function createContainer(): HTMLDivElement {
  const container = document.createElement('div')
  container.id = 'toast-container'
  container.style.cssText =
    'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;'
  document.body.appendChild(container)
  return container
}
