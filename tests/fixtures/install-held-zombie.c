#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>

int main(int argc, char **argv) {
  if (argc != 2) return 2;
  sigset_t clear;
  sigemptyset(&clear);
  sigprocmask(SIG_SETMASK, &clear, NULL);
  signal(SIGCHLD, SIG_DFL);
  signal(SIGTERM, SIG_DFL);
  signal(SIGALRM, SIG_DFL);
  alarm(10);
  pid_t installation_group = (pid_t)atoi(argv[1]);
  int ready[2];
  if (pipe(ready) != 0) return 3;
  pid_t reaper = fork();
  if (reaper < 0) return 4;
  if (reaper == 0) {
    close(ready[0]);
    close(STDIN_FILENO);
    close(STDOUT_FILENO);
    close(STDERR_FILENO);
    alarm(8);
    if (setpgid(0, 0) != 0) _exit(5);
    pid_t zombie = fork();
    if (zombie < 0) _exit(6);
    if (zombie == 0) {
      if (setpgid(0, installation_group) != 0) _exit(7);
      _exit(0);
    }
    siginfo_t information;
    if (waitid(P_PID, zombie, &information, WEXITED | WNOWAIT) != 0) _exit(8);
    if (information.si_code != CLD_EXITED || information.si_status != 0) _exit(13);
    const char *record = getenv("INSTALL_FIXTURE_CONTROL_PIDS");
    if (!record) _exit(9);
    int output = open(record, O_WRONLY | O_CREAT | O_APPEND, 0600);
    if (output < 0) _exit(10);
    dprintf(output, "{\"reaper\":%d,\"zombie\":%d,\"pgid\":%d,\"uid\":%d}\n", getpid(), zombie, installation_group, getuid());
    close(output);
    if (write(ready[1], "1", 1) != 1) _exit(11);
    close(ready[1]);
    for (;;) pause();
  }
  close(ready[1]);
  char acknowledged = 0;
  ssize_t count = read(ready[0], &acknowledged, 1);
  close(ready[0]);
  return count == 1 && acknowledged == '1' ? 0 : 12;
}
