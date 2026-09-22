declare namespace chrome {
  namespace tabs {
    type Tab = { url?: string; title?: string; favIconUrl?: string }
    const onUpdated: { addListener: (listener: (tabId: number, changeInfo: { status?: string; title?: string; url?: string }, tab: Tab) => void) => void }
    const onActivated: { addListener: (listener: (activeInfo: { tabId: number }) => void) => void }
    function get(tabId: number): Promise<Tab>
  }
  namespace runtime {
    function sendMessage(message: unknown): Promise<unknown>
    const onMessage: { addListener: (listener: (message: any) => void) => void }
  }
}
