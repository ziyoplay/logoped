import { useState } from 'react';
import { StoreProvider } from './store/StoreContext';
import { Layout } from './components/Layout';
import { DailyPlanPage } from './pages/DailyPlanPage';
import { ClientsPage } from './pages/ClientsPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReportsPage } from './pages/ReportsPage';
import type { Page } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('daily-plan');

  const renderPage = () => {
    switch (currentPage) {
      case 'daily-plan':
        return <DailyPlanPage />;
      case 'clients':
        return <ClientsPage />;
      case 'appointments':
        return <AppointmentsPage />;
      case 'assignments':
        return <AssignmentsPage />;
      case 'monitoring':
        return <MonitoringPage />;
      case 'exercises':
        return <ExercisesPage />;
      case 'progress':
        return <ProgressPage />;
      case 'products':
        return <ProductsPage />;
      case 'reports':
        return <ReportsPage />;
      default:
        return <DailyPlanPage />;
    }
  };

  return (
    <StoreProvider>
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </Layout>
    </StoreProvider>
  );
}

export default App;
