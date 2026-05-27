import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Overview from './components/Overview.jsx'
import ConversationList from './components/ConversationList.jsx'
import ConversationDetail from './components/ConversationDetail.jsx'
import MemoryPanel from './components/MemoryPanel.jsx'
import SkillPanel from './components/SkillPanel.jsx'
import HookPanel from './components/HookPanel.jsx'
import PluginPanel from './components/PluginPanel.jsx'
import McpPanel from './components/McpPanel.jsx'
import ConfigPanel from './components/ConfigPanel.jsx'
import PermissionPanel from './components/PermissionPanel.jsx'
import HarnessPanel from './components/HarnessPanel.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="harness" element={<HarnessPanel />} />
        <Route path="skills" element={<SkillPanel />} />
        <Route path="hooks" element={<HookPanel />} />
        <Route path="plugins" element={<PluginPanel />} />
        <Route path="memories" element={<MemoryPanel />} />
        <Route path="mcp" element={<McpPanel />} />
        <Route path="conversations" element={<ConversationList />} />
        <Route path="conversations/:id" element={<ConversationDetail />} />
        <Route path="config" element={<ConfigPanel />} />
        <Route path="permissions" element={<PermissionPanel />} />
      </Route>
    </Routes>
  )
}
