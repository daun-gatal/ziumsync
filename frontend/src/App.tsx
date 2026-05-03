import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import Dashboard from './views/Dashboard';
import Workspaces from './views/Workspaces';
import Credentials from './views/Credentials';
import Connections from './views/Connections';
import Pipelines from './views/Pipelines';
import PipelineDetail from './views/PipelineDetail';
import PipelineBuilder from './views/PipelineBuilder';

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/"            element={<Dashboard />} />
        <Route path="/workspaces"  element={<Workspaces />} />
        <Route path="/credentials" element={<Credentials />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/pipelines"   element={<Pipelines />} />
        <Route path="/pipelines/:id" element={<PipelineDetail />} />
        <Route path="/builder"     element={<PipelineBuilder />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
