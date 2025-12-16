export default function Card() {
  return (
    <div className="border rounded-lg p-4 max-w-md bg-white dark:bg-gray-800 w-full shadow-sm">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="bg-gray-200 dark:bg-gray-700 w-full sm:w-16 h-32 sm:h-16 rounded" />
        <div>
          <h3 className="font-semibold">Title</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Body text for whatever you’d like to say. Add main takeaway points, quotes, anecdotes, or even a very short story.
          </p>
          <button className="mt-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 border rounded hover:bg-gray-200 dark:hover:bg-gray-600">
            Button
          </button>
        </div>
      </div>
    </div>
  );
}
