
import { APP_NAME } from '../utils/env';

const Footer = () => {
    return (
        <footer className="premium-footer">
            <p>&copy; 2026 {APP_NAME}. All rights reserved.</p>
            <p>Made with Love by Reiuiji. | <a href="https://github.com/Equestrian-Broadcast-Service/viewer" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">V{__APP_VERSION__} ({__COMMIT_HASH__})</a></p>
        </footer>
    );
};

export default Footer;
