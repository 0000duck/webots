#include <stdio.h>
#include <windows.h>

int main(int argc, char *argv[]) {
  // compute the full command line with absolute path for webots-bin.exe, options and arguments
  const int l0 = strlen(argv[0]);
  int l = l0 + 1;  // final '\0'
  for (int i = 1; i < argc; i++)
    l += strlen(argv[i]) + 1;          // spaces between arguments
  char *command_line = malloc(l + 4);  // room for the extra "-bin" string
  command_line[0] = '\0';              // initially empty string
  strcat(command_line, argv[0]);
  command_line[l0 - 4] = '\0';  // cut out ".exe" after "webots"
  strcat(command_line, "-bin.exe");
  for (int i = 1; i < argc; i++) {
    strcat(command_line, " ");
    strcat(command_line, argv[i]);
  }

  // add "WEBOTS_HOME/msys64/mingw64/bin" and "WEBOTS_HOME/msys64/usr/bin" to the PATH environment variable
  const int LENGTH = 4096;
  char *old_path = malloc(LENGTH);
  char *new_path = malloc(LENGTH);
  strncpy(new_path, argv[0], l0 + 1);
  new_path[l0 - 11] = ';';  // removes "\webots.exe"
  strncpy(&new_path[l0 - 10], argv[0], l0 + 1);
  new_path[2 * l0 - 32] = '\0';
  strcat(new_path, "usr\\bin;");
  GetEnvironmentVariable("PATH", old_path, LENGTH);
  strcat(new_path, old_path);
  free(old_path);
  SetEnvironmentVariable("PATH", new_path);
  free(new_path);

  // start the webots-bin.exe process, wait for completion and return exit code
  STARTUPINFO info = {sizeof(info)};
  PROCESS_INFORMATION processInfo;
  DWORD success = CreateProcess(NULL, command_line, NULL, NULL, TRUE, 0, NULL, NULL, &info, &processInfo);
  free(command_line);
  if (!success)
    return 1;
  WaitForSingleObject(processInfo.hProcess, INFINITE);
  DWORD dwExitCode;
  GetExitCodeProcess(processInfo.hProcess, &dwExitCode);
  CloseHandle(processInfo.hProcess);
  CloseHandle(processInfo.hThread);
  return dwExitCode;
}
