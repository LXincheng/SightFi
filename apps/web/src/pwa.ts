import { registerSW } from 'virtual:pwa-register'

export function setupPwa(): void {
  registerSW({
    immediate: true,
    onRegistered(registration?: ServiceWorkerRegistration) {
      if (!registration) {
        return
      }
      setInterval(() => {
        void registration.update()
      }, 60_000)
    },
  })
}
