import AuthBrandPanel from './AuthBrandPanel';
import AuthFormPanel from './AuthFormPanel';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      <AuthBrandPanel />
      <AuthFormPanel />
    </div>
  );
}
