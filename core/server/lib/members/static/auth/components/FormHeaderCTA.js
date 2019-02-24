import { IconRightArrow } from './icons';

export default ({title, label, hash}) => (
    <div className="gm-auth-cta">
        <h4>{ title }</h4>
        <a href={hash}>
            { label }
            { IconRightArrow }
        </a>
    </div>
);
