
import { APP_NAME } from '../utils/env';

interface FooterProps {
  onOpenCredits: () => void;
}

const Footer = ({ onOpenCredits }: FooterProps) => {
    return (
        <footer className="premium-footer">
            <p>&copy; 2026 {APP_NAME}. All rights reserved.</p>
            <p>
              Made with Love by Reiuiji. |{' '}
              <button
                onClick={onOpenCredits}
                className="hover:text-teal-400 cursor-pointer transition-colors focus:outline-none"
                type="button"
              >
                Credits
              </button>{' '}
              |{' '}
              <a
                href="https://github.com/Equestrian-Broadcast-Service/viewer"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-teal-400 transition-colors"
              >
                V{__APP_VERSION__} ({__COMMIT_HASH__})
              </a>
            </p>
        </footer>
    );
};

export default Footer;
