import LoginForm from '../../components/LoginForm'
import AuthLayout from '../../components/layout/AuthLayout'

function LoginPage() {
  return (
    <AuthLayout titleId="login-title"><LoginForm /></AuthLayout>
  )
}

export default LoginPage
