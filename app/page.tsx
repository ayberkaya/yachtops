export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4">YachtOps</h1>
      <p className="text-lg mb-8">Yacht Operations Management Platform</p>
      <a href="/auth/signin" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Access Platform
      </a>
    </div>
  );
}
