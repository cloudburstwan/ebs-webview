
import { APP_NAME } from '../utils/env';

const Footer = () => {
    return (
        <footer className="premium-footer">
            <p>&copy; 2026 {APP_NAME}. All rights reserved.</p>
            <p>Made with Love by Reiuiji. | V{__APP_VERSION__}</p>
        </footer>
    );
};

export default Footer;
