export function useNotifications() {
  async function subscribe() {
    // TODO: request notification permission, create Web Push subscription,
    // POST to /api/push/subscribe
  }

  async function unsubscribe() {
    // TODO: DELETE /api/push/subscribe
  }

  return { subscribe, unsubscribe }
}
