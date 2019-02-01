from controller import Supervisor

import c3d

def getPointsList(reader, name):
    list = reader.groups['POINT'].get_string(name)
    elementSize = reader.groups['POINT'].get(name).dimensions[0]
    newlist = [list[i:i + elementSize] for i in range(0, len(list), elementSize)]
    for i in range(len(newlist)):
        newlist[i] = newlist[i].strip()
    return newlist

supervisor = Supervisor()
timestep = int(supervisor.getBasicTimeStep())

reader = c3d.Reader(open('00021_00081_20071128-GBNNN-VDEF-07.C3D', 'rb'))
print('Header:')
print(reader.header)
labels = getPointsList(reader, 'LABELS')
angleLabels = getPointsList(reader, 'ANGLES')
forcesLabels = getPointsList(reader, 'FORCES')
momentsLabels = getPointsList(reader, 'MOMENTS')
powersLabels = getPointsList(reader, 'POWERS')

filteredLabel = [x for x in labels if x not in angleLabels]
filteredLabel = [x for x in filteredLabel if x not in forcesLabels]
filteredLabel = [x for x in filteredLabel if x not in momentsLabels]
filteredLabel = [x for x in filteredLabel if x not in powersLabels]

print(filteredLabel)

supervisor.wwiSendText(" ".join(filteredLabel))

numberOfpoints = reader.header.point_count

scale = reader.header.scale_factor
if reader.groups['POINT'].get('UNITS').string_value == 'mm':
    scale *= 0.001
else:
    print("Can't determine the size unit.")


childrenField = supervisor.getSelf().getField('children')
pointRepresentations = {}
j = 0
for i in range(len(labels)):
    pointRepresentations[labels[i]] = {}
    pointRepresentations[labels[i]]['visible'] = False
    pointRepresentations[labels[i]]['node'] = None
    if labels[i] in filteredLabel:
        pointRepresentations[labels[i]]['visible'] = True
        childrenField.importMFNodeFromString(-1, 'DEF MARKER%d Marker { }' % j)
        pointRepresentations[labels[i]]['node'] = supervisor.getFromDef('MARKER%d' % j)
        pointRepresentations[labels[i]]['translation'] = pointRepresentations[labels[i]]['node'].getField('translation')
        pointRepresentations[labels[i]]['transparency'] = pointRepresentations[labels[i]]['node'].getField('transparency')
        j += 1

frameAndPoints = []
for i, points, analog in reader.read_frames():
    frameAndPoints.append((i, points))

i = 0
while supervisor.step(timestep) != -1:
    message = supervisor.wwiReceiveText()
    while message:
        print(message)
        value = message.split(':')
        marker = value[0]
        action = value[1]
        if action == 'disable':
            pointRepresentations[marker]['visible'] = False
            pointRepresentations[marker]['transparency'].setSFFloat(1.0)
        elif action == 'enable':
            pointRepresentations[marker]['visible'] = True
            pointRepresentations[marker]['transparency'].setSFFloat(0.0)
        message = supervisor.wwiReceiveText()
    frame = frameAndPoints[i][0]
    points = frameAndPoints[i][1]

    for j in range(numberOfpoints):
        if pointRepresentations[labels[j]]['visible']:
            x = points[j][0] * scale
            y = -points[j][2] * scale
            z = points[j][1] * scale
            pointRepresentations[labels[j]]['node'].getField('translation').setSFVec3f([x, y, z])
    i += 1
    if i >= len(frameAndPoints):
        i = 0
