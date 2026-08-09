import SharedLayout from '../../components/SharedLayout';

export default function Messages() {
 return (
 <SharedLayout role="patient">
 <div className="w-full mx-auto p-4 md:p-6 flex-1 h-full">
 <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>
 <div className="bg-white rounded-md border p-6 flex items-center justify-center min-h-[400px]">
 <p className="text-gray-500">You have no new messages.</p>
 </div>
 </div>
 </SharedLayout>
 );
}
