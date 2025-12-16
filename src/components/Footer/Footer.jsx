import FooterLogo from './FooterLogo';
import SocialLinks from './SocialLinks';
import FooterColumn from './FooterColumn';

export default function Footer() {
  const useCases = ['UI design', 'UX design', 'Wireframing', 'Diagramming', 'Brainstorming', 'Online whiteboard', 'Team collaboration'];
  const explore = ['Design', 'Prototyping', 'Development features', 'Design systems', 'Collaboration features', 'Design process', 'FigJam'];
  const resources = ['Blog', 'Best practices', 'Colors', 'Color wheel', 'Support', 'Developers', 'Resource library'];

  return (
    <footer className="bg-gray-50 dark:bg-gray-800 border-t p-6 sm:p-8 mt-8">
      <div className="flex flex-col md:flex-row gap-8 justify-between">
        <div className="flex flex-col items-start md:items-center md:w-1/4">
          <FooterLogo />
          <SocialLinks />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 w-full md:w-3/4">
          <FooterColumn title="Use cases" items={useCases} />
          <FooterColumn title="Explore" items={explore} />
          <FooterColumn title="Resources" items={resources} />
        </div>
      </div>
    </footer>
  );
}
