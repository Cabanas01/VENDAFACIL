import { Metadata } from 'next';
import AdminAiContent from './ai-admin-content';

/**
 * @fileOverview Página de IA do Admin (Server Component Burro)
 */

export const metadata: Metadata = {
  title: 'IA de Governança | VendaFácil Admin',
};

export default function AdminAiPage() {
  return (
    <div className="space-y-6">
      <AdminAiContent />
    </div>
  );
}
