import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CustomerChatbot from '../../../features/ai-chatbot/components/CustomerChatbot';

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-on-background font-body">
      <Header />
      <main className="flex-grow pt-[94px]">
        <Outlet />
      </main>
      <Footer />
      <CustomerChatbot />
    </div>
  );
}
