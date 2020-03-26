/*
 * Copyright 1996-2020 Cyberbotics Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include <webots/robot.h>

#include <webots/utils/ansi_codes.h>

#define TIME_STEP 64

int main(int argc, char **argv) {
  wb_robot_init();

  ANSI_PRINTF_IN_GREEN("This text will not be seen because we are going to clear the console");
  ANSI_CONSOLE_CLEAR;

  ANSI_PRINTF_IN_RED("Red text!");
  ANSI_PRINTF_IN_GREEN("Green text!");
  ANSI_PRINTF_IN_YELLOW("Yellow text!");
  ANSI_PRINTF_IN_CYAN("Cyan text!");
  ANSI_PRINTF_IN_BLUE("Blue text!");
  ANSI_PRINTF_IN_MAGENTA("Magenta text!");
  ANSI_PRINTF_IN_WHITE("White text!");
  ANSI_PRINTF_IN_BLACK("Black text!");
  printf("\n");  // If we add \n in the above macro, the controller text will use previous style

  printf("%sBlue background only specified text!%s\n\n", ANSI_BLUE_BACKGROUND, ANSI_RESET);

  ANSI_PRINTF_IN_WHITE("%sRed background only", ANSI_RED_BACKGROUND);
  ANSI_PRINTF_IN_WHITE("%sGreen background only", ANSI_GREEN_BACKGROUND);
  ANSI_PRINTF_IN_WHITE("%sYellow background only", ANSI_YELLOW_BACKGROUND);
  ANSI_PRINTF_IN_WHITE("%sCyan background only", ANSI_CYAN_BACKGROUND);
  ANSI_PRINTF_IN_WHITE("%sBlue background only", ANSI_BLUE_BACKGROUND);
  ANSI_PRINTF_IN_WHITE("%sMangenta background only", ANSI_MAGENTA_BACKGROUND);
  ANSI_PRINTF_IN_WHITE("%sWhite background only", ANSI_WHITE_BACKGROUND);
  ANSI_PRINTF_IN_WHITE("%sCyan text on Black background", ANSI_BLACK_BACKGROUND);
  printf("\n");

  ANSI_PRINTF_IN_BLUE("%sBlue text on Red background", ANSI_RED_BACKGROUND);
  ANSI_PRINTF_IN_YELLOW("%sYellow text on Green background", ANSI_GREEN_BACKGROUND);
  ANSI_PRINTF_IN_MAGENTA("%sMagenta text on Yellow background", ANSI_YELLOW_BACKGROUND);
  ANSI_PRINTF_IN_RED("%sRed text on Cyan background", ANSI_CYAN_BACKGROUND);
  ANSI_PRINTF_IN_WHITE("%sWhite text on Blue background", ANSI_BLUE_BACKGROUND);
  ANSI_PRINTF_IN_GREEN("%sGreen text on Magenta background", ANSI_MAGENTA_BACKGROUND);
  ANSI_PRINTF_IN_BLACK("%sBlack text on White background", ANSI_WHITE_BACKGROUND);
  ANSI_PRINTF_IN_CYAN("%sCyan text on Black background", ANSI_BLACK_BACKGROUND);
  printf("\n");

  ANSI_PRINTF_IN_GREEN("%sGreen Bold style text", ANSI_BOLD);
  ANSI_PRINTF_IN_GREEN("%sGreen Underlined style text", ANSI_UNDERLINE);

  wb_robot_cleanup();
  return 0;
}
