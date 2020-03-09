// Copyright 1996-2020 Cyberbotics Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#include "WbMultimediaStreamingServer.hpp"

#include "WbMainWindow.hpp"
#include "WbRobot.hpp"
#include "WbSimulationState.hpp"
#include "WbView3D.hpp"
#include "WbViewpoint.hpp"
#include "WbWorld.hpp"

#include <QtCore/QBuffer>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtGui/QMouseEvent>
#include <QtWebSockets/QWebSocket>

static WbView3D *gView3D = NULL;

WbMultimediaStreamingServer::~WbMultimediaStreamingServer() {
  if (isActive())
    stop();
}

void WbMultimediaStreamingServer::setView3D(WbView3D *view3D) {
  gView3D = view3D;
  gView3D->setVideoStreamingServer(this);
}

void WbMultimediaStreamingServer::start(int port) {
  WbStreamingServer::start(port);
  WbLog::info(
    tr("Webots multimedia streamer started: resolution %1x%2 on port %3").arg(mImageWidth).arg(mImageHeight).arg(port));
}

void WbMultimediaStreamingServer::sendTcpRequestReply(const QString &requestedUrl, QTcpSocket *socket) {
  if (requestedUrl != "mjpeg")
    return;
  socket->readAll();

  static const QByteArray &contentType = ("HTTP/1.0 200 OK\r\nServer: Webots\r\nConnection: close\r\nMax-Age: 0\r\n"
                                          "Expires: 0\r\nCache-Control: no-cache, private\r\nPragma: no-cache\r\n"
                                          "Content-Type: multipart/x-mixed-replace; boundary=--WebotsFrame\r\n\r\n");
  socket->write(contentType);
  mTcpClients.append(socket);
  // TODO: send immediately the first image on connections
  // if non has been generated yet, then do it
  // if (mUpdateTimer->isValid())
  //  sendImage(mSceneImage);
}

bool WbMultimediaStreamingServer::isNewFrameNeeded() const {
  if (!isActive() || mTcpClients.isEmpty())
    return false;
  if (!mUpdateTimer.isValid())
    return true;

  const qint64 nsecs = mUpdateTimer.nsecsElapsed();
  return nsecs >= 5e7;  // maximum update frame rate
}

void WbMultimediaStreamingServer::sendImage(QImage image) {
  const double simulationTime = WbSimulationState::instance()->time();
  sendToClients(QString("time: %1").arg(simulationTime));

  mSceneImage = image;
  QByteArray im;
  QBuffer bufferJpeg(&im);
  bufferJpeg.open(QIODevice::WriteOnly);
  mSceneImage.save(&bufferJpeg, "JPG");
  const QByteArray &boundaryString =
    QString("--WebotsFrame\r\nContent-type: image/jpg\r\nContent-Length: %1\r\n\r\n").arg(im.length()).toUtf8();

  foreach (QTcpSocket *client, mTcpClients) {
    if (client->state() != QAbstractSocket::ConnectedState) {
      mTcpClients.removeAll(client);
      continue;
    }
    if (!client->isValid())
      continue;
    client->write(boundaryString);
    client->write(im);
    client->write(QByteArray("\r\n\r\n"));
    client->flush();
  }

  mUpdateTimer.restart();
}

void WbMultimediaStreamingServer::sendContextMenuInfo(const WbMatter *contextMenuNode) {
  QJsonObject object;
  object.insert("name", contextMenuNode->name());
  object.insert("docUrl", contextMenuNode->documentationUrl());
  const WbRobot *robot = dynamic_cast<const WbRobot *>(contextMenuNode);
  object.insert("controller", robot ? robot->controllerName() : "");
  const WbSolid *const solid = dynamic_cast<const WbSolid *>(contextMenuNode);
  if (solid) {
    const WbViewpoint *viewpoint = WbWorld::instance()->viewpoint();
    const bool isFollowed = viewpoint->isFollowed(solid);
    object.insert("follow", isFollowed ? viewpoint->followType() : 0);
  } else
    object.insert("follow", -1);
  QJsonDocument jsonDocument(object);
  sendToClients("context menu: " + jsonDocument.toJson(QJsonDocument::Compact));
}

void WbMultimediaStreamingServer::processTextMessage(QString message) {
  QWebSocket *client = qobject_cast<QWebSocket *>(sender());

  if (message.startsWith("mouse")) {
    int action, button, buttons, x, y, modifiers, wheel;
    QString skip;  // will receive "mouse"
    QTextStream(&message) >> skip >> action >> button >> buttons >> x >> y >> modifiers >> wheel;
    const QPointF point(x, y);
    const Qt::MouseButtons buttonsPressed = ((buttons & 1) ? Qt::LeftButton : Qt::NoButton) |
                                            ((buttons & 2) ? Qt::RightButton : Qt::NoButton) |
                                            ((buttons & 4) ? Qt::MiddleButton : Qt::NoButton);
    const Qt::KeyboardModifiers keyboardModifiers = ((modifiers & 1) ? Qt::ShiftModifier : Qt::NoModifier) |
                                                    ((modifiers & 2) ? Qt::ControlModifier : Qt::NoModifier) |
                                                    ((modifiers & 4) ? Qt::AltModifier : Qt::NoModifier);
    if (action <= 1) {
      QInputEvent::Type type;
      Qt::MouseButton buttonPressed;
      if (action == 0) {
        type = QEvent::MouseMove;
        buttonPressed = Qt::NoButton;
      } else {
        switch (button) {
          case 1:
            buttonPressed = Qt::LeftButton;
            break;
          case 2:
            buttonPressed = Qt::RightButton;
            break;
          case 3:
            buttonPressed = Qt::MiddleButton;
            break;
          default:
            buttonPressed = Qt::NoButton;
            break;
        }
        if (action == -1)
          type = QEvent::MouseButtonPress;
        else if (action == 1)
          type = QEvent::MouseButtonRelease;
        else
          type = QEvent::MouseMove;
      }
      QMouseEvent event(type, point, buttonPressed, buttonsPressed, keyboardModifiers);
      if (gView3D) {
        const WbMatter *contextMenuNode = gView3D->remoteMouseEvent(&event);
        if (contextMenuNode)
          sendContextMenuInfo(contextMenuNode);
      }
    } else if (action == 2) {
      wheel = -wheel;  // Wheel delta is inverted in JS and Webots
      QWheelEvent wheelEvent(point, point, QPoint(), QPoint(), wheel, Qt::Vertical, buttonsPressed, keyboardModifiers);
      if (gView3D)
        gView3D->remoteWheelEvent(&wheelEvent);
    }
  } else if (message.startsWith("video: ")) {
    const QStringList &resolution = message.mid(7).split("x");
    const int width = resolution[0].toInt();
    const int height = resolution[1].toInt();
    WbLog::info(
      tr("Streaming server: New client [%1] (%2 connected client(s)).").arg(clientToId(client)).arg(mWebSocketClients.size()));
    if (mImageWidth <= 0 && mImageHeight <= 0) {
      cMainWindow->setView3DSize(QSize(width, height));
      mImageWidth = width;
      mImageHeight = height;
      WbLog::info(tr("Streaming server: Resolution changed to %1x%2.").arg(width).arg(height));
    } else
      // Video streamer already initialized
      WbLog::info(tr("Streaming server: Ignored new client request of resolution: %1x%2.").arg(width).arg(height));
    client->sendTextMessage(QString("video: /mjpeg %2").arg(simulationStateString()));
    const QString &stateMessage = simulationStateString();
    if (!stateMessage.isEmpty())
      client->sendTextMessage(stateMessage);
    sendWorldToClient(client);
  } else if (message.startsWith("resize: ")) {
    if (client == mWebSocketClients.first()) {
      const QStringList &resolution = message.mid(8).split("x");
      mImageWidth = resolution[0].toInt();
      mImageHeight = resolution[1].toInt();
      WbLog::info(tr("Streaming server: Client resize: new resolution %1x%2.").arg(mImageWidth).arg(mImageHeight));
      cMainWindow->setView3DSize(QSize(mImageWidth, mImageHeight));
    } else
      WbLog::info(tr("Streaming server: Invalid client resize: only the first connected client can resize the simulation."));
  } else if (message.startsWith("follow: ")) {
    const int separatorIndex = message.indexOf(',');
    const QString &mode = message.mid(8, separatorIndex - 8);
    const QString &solidId = message.mid(separatorIndex + 1);
    WbSolid *const solid = WbSolid::findSolidFromUniqueName(solidId);
    WbViewpoint *const viewpoint = WbWorld::instance()->viewpoint();
    if (viewpoint->followedSolid())
      viewpoint->terminateFollowUp();
    if (solid) {
      viewpoint->setFollowType(mode.toInt());
      viewpoint->startFollowUp(solid, true);
    }
  } else
    WbStreamingServer::processTextMessage(message);
}
