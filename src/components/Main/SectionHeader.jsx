export default function SectionHeader({ heading, subheading, children }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold">{heading}</h2>
      <p className="text-gray-500 dark:text-gray-400">{subheading}</p>
      {children}
    </div>
  );
}
