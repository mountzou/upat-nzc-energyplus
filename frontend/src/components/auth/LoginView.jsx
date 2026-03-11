import AppFooter from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginView({
  username,
  password,
  error,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 items-center p-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form className="grid gap-4" onSubmit={onSubmit}>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Username</span>
                <input
                  className="h-10 rounded-md border border-input bg-background px-3"
                  type="text"
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  placeholder="school_22"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Password</span>
                <input
                  className="h-10 rounded-md border border-input bg-background px-3"
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="1234"
                />
              </label>
              <Button type="submit" size="lg">
                Login
              </Button>
            </form>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-sm text-muted-foreground">
              Use `school_X` as username and `1234` as password.
            </p>
          </CardContent>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
