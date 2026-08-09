import SharedLayout from '../../components/SharedLayout';

export default function Patients() {
 return (
 <SharedLayout role="doctor">
 <div className="w-full mx-auto p-4 md:p-6 flex-1 h-full">
 <h1 className="text-2xl font-bold text-gray-900 mb-6">Patient Directory</h1>
 <div className="bg-white rounded-md border p-6 flex items-center justify-center min-h-[400px]">
 <p className="text-gray-500">Patient list will be displayed here.</p>
 </div>
 </div>
 </SharedLayout>
 );
}
