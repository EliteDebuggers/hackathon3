import SharedLayout from '../../components/SharedLayout';
import { Icon } from '@iconify/react';

export default function Messages() {
  return (
    <SharedLayout role="patient">
      <div className="w-full p-3 md:p-5 flex-1 h-full flex flex-col gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Messages & Consultations</h1>
            <p className="text-gray-500 text-xs mt-0.5">Communicate directly with your attending healthcare specialists.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 flex flex-col items-center justify-center min-h-[400px] flex-1 text-center shadow-sm">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-3">
            <Icon icon="solar:chat-round-line-bold-duotone" className="w-12 h-12" />
          </div>
          <h3 className="text-base font-bold text-gray-800">No active conversations yet</h3>
          <p className="text-gray-500 text-xs mt-1 max-w-sm">Book an appointment with a specialist to start a direct consultation message thread.</p>
        </div>
      </div>
    </SharedLayout>
  );
}
