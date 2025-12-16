export default function AuthButtons() {
  return (
    <div className="flex gap-2">
      <button className="border rounded px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Sign in</button>
      <button className="bg-gray-900 text-white dark:bg-gray-200 dark:text-black rounded px-3 py-1 text-sm hover:opacity-90">Register</button>
    </div>
  );
}
