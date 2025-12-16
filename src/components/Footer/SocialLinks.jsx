import { Youtube, Instagram, Linkedin, X } from 'lucide-react';

export default function SocialLinks() {
  return (
    <div className="flex gap-3 text-gray-600 dark:text-gray-300">
      <X size={16} />
      <Instagram size={16} />
      <Youtube size={16} />
      <Linkedin size={16} />
    </div>
  );
}
