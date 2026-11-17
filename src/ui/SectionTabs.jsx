export function SectionTabs({ tabsId, label, tabs, selectedTab, onSelect, panelId }) {
  return (
    <div
      className="garageDash__tabs row gap wrap"
      role="tablist"
      aria-label={label}
      onKeyDown={(event) => {
        const index = tabs.findIndex(({ key }) => key === selectedTab)
        let nextIndex
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
        else if (event.key === 'ArrowLeft') nextIndex = (index + tabs.length - 1) % tabs.length
        else if (event.key === 'Home') nextIndex = 0
        else if (event.key === 'End') nextIndex = tabs.length - 1
        else return
        event.preventDefault()
        onSelect(tabs[nextIndex].key)
        event.currentTarget.children[nextIndex]?.focus()
      }}
    >
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          id={`${tabsId}-tab-${key}`}
          type="button"
          role="tab"
          aria-selected={selectedTab === key}
          aria-controls={panelId ?? `${tabsId}-panel-${key}`}
          tabIndex={selectedTab === key ? 0 : -1}
          className={`garageDash__tab${selectedTab === key ? ' garageDash__tab--active' : ''}`}
          onClick={() => onSelect(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
