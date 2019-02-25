import Form from '../components/Form';
import FormHeader from '../components/FormHeader';
import FormHeaderCTA from '../components/FormHeaderCTA';
import FormSubmit from '../components/FormSubmit';

import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';

export default ({ error, handleSubmit }) => (
    <div className="gm-modal-form gm-signin-page">
        <FormHeader title="Log in" error={error} errorText="Wrong email or password" />
        <Form onSubmit={handleSubmit}>
            <EmailInput bindTo="email" className="first" />
            <PasswordInput bindTo="password" className="gm-forgot-input last">
                <a href="#request-password-reset" className="gm-forgot-link">
                    Forgot
                    </a>
            </PasswordInput>
            <FormSubmit label="Log in" />
        </Form>
        
        <FormHeaderCTA title="Not a member?" label="Sign up" hash="#signup" />
    </div>
);
