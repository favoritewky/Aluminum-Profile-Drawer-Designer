import CabinetSection from './CabinetSection.jsx'
import ProfileSection from './ProfileSection.jsx'
import DrawerSection from './DrawerSection.jsx'
import RailSection from './RailSection.jsx'
import PanelExpandSection from './PanelExpandSection.jsx'
import MaterialSection from './MaterialSection.jsx'
import ConnectorSection from './ConnectorSection.jsx'

export default function Sidebar({ state, set, setMany, setDrawerCount, setDrawerField, cycleExpand, setCurrentDrawer }) {
  return (
    <aside className="w-[370px] min-w-[370px] bg-white border-r border-slate-200 overflow-y-auto flex flex-col"
      style={{ height: 'calc(100vh - 52px)' }}>
      <CabinetSection state={state} set={set} setDrawerCount={setDrawerCount} />
      <ProfileSection state={state} set={set} setMany={setMany} />
      <DrawerSection state={state} set={set} setDrawerField={setDrawerField} setCurrentDrawer={setCurrentDrawer} />
      <RailSection state={state} set={set} setMany={setMany} />
      <PanelExpandSection state={state} cycleExpand={cycleExpand} />
      <MaterialSection state={state} set={set} />
      <ConnectorSection state={state} set={set} />
      <div className="p-4 pb-6">
        <div className="text-[11px] text-slate-400 text-center">所有修改实时生效</div>
      </div>
    </aside>
  )
}
