"""
Rebuild SmallPinion_Layer2.003 as 16T spur pinion to drive LayerCarousel_4.001.

File: PillSafe_Design_SIZED_copy.blend ONLY
- Layer 4 unchanged
- Sibling pinions unchanged
- CD = R_p + 96.11 + 0.2 mm clearance
- Tip:space matches Layer 4 measured ratio (~2:3 of pitch = tip frac 0.4)
"""
from __future__ import annotations

import math

import bmesh
import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

BLEND = r"C:\Users\Boison\Documents\GitHub\pillSafe_projectupdated\hardware\cad\PillSafe_Design_SIZED_copy.blend"

# Layer 4 reference (fixed)
R_PITCH_L4 = 96.11
CIRC_PITCH = 8.39  # at Layer 4 pitch circle
TOOTH_HALF_H = 2.78  # radial addendum/dedendum (~5.56 total)
TIP_FRAC = 0.40  # Layer 4 measured ~2° tip / 5° pitch

# Pinion design
Z_P = 16
R_PITCH_P = Z_P * CIRC_PITCH / (2.0 * math.pi)  # 21.372
R_TIP_P = R_PITCH_P + TOOTH_HALF_H
R_ROOT_P = R_PITCH_P - TOOTH_HALF_H
CLEARANCE = 0.20
CD_TARGET = R_PITCH_P + R_PITCH_L4 + CLEARANCE  # 117.682

FACE = 6.0
BORE_R = 1.45


def make_trapezoid_pinion(name: str):
    pitch_ang = 2.0 * math.pi / Z_P
    tip_ang = pitch_ang * TIP_FRAC
    # one tooth outline in local XY, tooth centred on +X
    half_tip = 0.5 * tip_ang
    half_space_edge = 0.5 * pitch_ang  # to mid-space (tooth occupies -half_pitch..+half_pitch with tip in middle)

    # Corners (CCW): root left, tip left, tip right, root right — then close under tooth via root arc through space? 
    # Full gear: for each tooth k, place tip sector then root sector.
    outline = []
    for k in range(Z_P):
        a0 = k * pitch_ang  # tooth centre
        # tip flat
        a_tl = a0 - half_tip
        a_tr = a0 + half_tip
        # root flats occupy the rest until next tooth tip
        a_next = (k + 1) * pitch_ang
        a_rl = a_tr  # start root after tip (with short radial flank)
        a_rr = a_next - half_tip  # end root before next tip

        # tip points
        outline.append((R_TIP_P * math.cos(a_tl), R_TIP_P * math.sin(a_tl)))
        # sample tip arc/flat
        for i in range(1, 4):
            a = a_tl + (a_tr - a_tl) * (i / 4)
            outline.append((R_TIP_P * math.cos(a), R_TIP_P * math.sin(a)))
        outline.append((R_TIP_P * math.cos(a_tr), R_TIP_P * math.sin(a_tr)))

        # radial flank tip -> root
        outline.append((R_ROOT_P * math.cos(a_tr), R_ROOT_P * math.sin(a_tr)))

        # root flat
        for i in range(1, 5):
            a = a_tr + (a_rr - a_tr) * (i / 5)
            outline.append((R_ROOT_P * math.cos(a), R_ROOT_P * math.sin(a)))
        outline.append((R_ROOT_P * math.cos(a_rr), R_ROOT_P * math.sin(a_rr)))

        # radial flank root -> next tip (next iteration starts at next tip)
        # next tooth will add tip; connect with radial at a_rr already at root;
        # add point at tip radius of next tooth left edge prep — skip, next loop adds tip at a_next-half_tip
        # Need radial up to next tip left:
        a_ntl = a_next - half_tip
        outline.append((R_TIP_P * math.cos(a_ntl), R_TIP_P * math.sin(a_ntl)))

    # dedupe near-equal
    cleaned = [outline[0]]
    for p in outline[1:]:
        if math.hypot(p[0] - cleaned[-1][0], p[1] - cleaned[-1][1]) > 1e-5:
            cleaned.append(p)
    # ensure closed for tessellate (don't duplicate first in list for from_pydata sides)
    if math.hypot(cleaned[0][0] - cleaned[-1][0], cleaned[0][1] - cleaned[-1][1]) < 1e-5:
        cleaned.pop()

    outline = cleaned
    z0, z1 = -0.5 * FACE, 0.5 * FACE
    tris = tessellate_polygon([[Vector((x, y, 0.0)) for x, y in outline]])
    verts = [(x, y, z0) for x, y in outline] + [(x, y, z1) for x, y in outline]
    n = len(outline)
    faces = []
    for a, b, c in tris:
        faces.append((a, c, b))
    for a, b, c in tris:
        faces.append((a + n, b + n, c + n))
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, j + n, i + n))

    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)

    # Bore
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48, radius=BORE_R, depth=FACE * 1.3, location=(0, 0, 0)
    )
    cutter = bpy.context.active_object
    mod = obj.modifiers.new("Bore", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    try:
        mod.solver = "EXACT"
    except Exception:
        pass
    mod.object = cutter
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier="Bore")
    bpy.data.objects.remove(cutter, do_unlink=True)

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    return obj


def verify(car, pin, cd_target):
    cx, cy = car.matrix_world.translation.x, car.matrix_world.translation.y
    px, py = pin.matrix_world.translation.x, pin.matrix_world.translation.y
    cd = math.hypot(px - cx, py - cy)

    # pinion envelope
    deps = bpy.context.evaluated_depsgraph_get()
    eo = pin.evaluated_get(deps)
    me = eo.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.transform(pin.matrix_world)
    rs = [math.hypot(v.co.x - px, v.co.y - py) for v in bm.verts]
    zs = [v.co.z for v in bm.verts]
    tip = max(rs)
    # root approx: exclude bore
    outer = [r for r in rs if r > BORE_R * 1.5]
    root = min(outer) if outer else min(rs)
    eo.to_mesh_clear()
    bm.free()

    # tooth count via period on envelope
    env = [None] * 360
    eo = pin.evaluated_get(deps)
    me = eo.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.transform(pin.matrix_world)
    for v in bm.verts:
        dx, dy = v.co.x - px, v.co.y - py
        r = math.hypot(dx, dy)
        if r < tip * 0.85:
            continue
        d = int(round(math.degrees(math.atan2(dy, dx)))) % 360
        if env[d] is None or r > env[d]:
            env[d] = r
    for i in range(360):
        if env[i] is None:
            for k in range(1, 30):
                if env[(i - k) % 360] is not None:
                    env[i] = env[(i - k) % 360]
                    break
    mean = sum(env) / 360
    sig = [r - mean for r in env]
    best_p, best_c = 3, -1
    for p in range(3, 60):
        c = sum(sig[i] * sig[(i + p) % 360] for i in range(360))
        if c > best_c:
            best_c, best_p = c, p
    teeth = round(360 / best_p)
    eo.to_mesh_clear()
    bm.free()

    circ = 2 * math.pi * R_PITCH_P / Z_P
    cz0, cz1 = min(zs), max(zs)
    # layer4 z
    eo = car.evaluated_get(deps)
    me = eo.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.transform(car.matrix_world)
    lzs = [v.co.z for v in bm.verts]
    lz0, lz1 = min(lzs), max(lzs)
    eo.to_mesh_clear()
    bm.free()
    z_overlap = max(0.0, min(cz1, lz1) - max(cz0, lz0))

    tip_sum = 100.0 + tip
    print("\n=== VERIFY ===")
    print(f"  teeth≈{teeth} (target {Z_P})")
    print(f"  tip_r={tip:.3f} (target {R_TIP_P:.3f}) root_r≈{root:.3f} (target {R_ROOT_P:.3f})")
    print(f"  R_pitch_p={R_PITCH_P:.3f} circ_pitch={circ:.3f} (L4 {CIRC_PITCH})")
    print(f"  CD={cd:.3f} (target {cd_target:.3f}) err={cd-cd_target:.3f}")
    print(f"  CD vs pitch_sum {R_PITCH_P+R_PITCH_L4:.3f} => clearance={cd-(R_PITCH_P+R_PITCH_L4):.3f}")
    print(f"  tip_sum={tip_sum:.3f} tip_clearance={cd-tip_sum:.3f}")
    print(f"  Z pinion [{cz0:.2f},{cz1:.2f}] L4 [{lz0:.2f},{lz1:.2f}] overlap={z_overlap:.2f}")
    print(f"  scale={tuple(round(s,4) for s in pin.scale)}")
    ok = (
        abs(teeth - Z_P) <= 1
        and abs(tip - R_TIP_P) < 0.35
        and abs(cd - cd_target) < 0.05
        and abs(pin.scale.x - 1.0) < 1e-6
        and z_overlap > 3.0
    )
    print(f"  MESH_OK={ok}")
    return ok


def main():
    car = bpy.data.objects["LayerCarousel_4.001"]
    pin = bpy.data.objects["SmallPinion_Layer2.003"]

    # Ensure single-user mesh
    if pin.data.users > 1:
        pin.data = pin.data.copy()

    print("=== DESIGN ===")
    print(f"  Z={Z_P} R_pitch={R_PITCH_P:.3f} R_tip={R_TIP_P:.3f} R_root={R_ROOT_P:.3f}")
    print(f"  tip_frac={TIP_FRAC} tip_ang_deg={360/Z_P*TIP_FRAC:.2f} space_ang_deg={360/Z_P*(1-TIP_FRAC):.2f}")
    print(f"  CD_target={CD_TARGET:.3f} (pitch {R_PITCH_P+R_PITCH_L4:.3f} + clearance {CLEARANCE})")

    # Preserve material
    mat = None
    if pin.material_slots and pin.material_slots[0].material:
        mat = pin.material_slots[0].material
    else:
        mat = bpy.data.materials.get("Mat_Steel")

    old_z = pin.matrix_world.translation.z
    # Direction from carousel to current pinion
    cx, cy = car.matrix_world.translation.x, car.matrix_world.translation.y
    px, py = pin.matrix_world.translation.x, pin.matrix_world.translation.y
    dx, dy = px - cx, py - cy
    dist = math.hypot(dx, dy) or 1.0
    ux, uy = dx / dist, dy / dist

    # Build new mesh object then swap datablock
    tmp = make_trapezoid_pinion("TMP_PINION_16")
    new_mesh = tmp.data
    tmp.data = bpy.data.meshes.new("tmp_dummy")
    bpy.data.objects.remove(tmp, do_unlink=True)

    old_mesh = pin.data
    pin.data = new_mesh
    pin.data.name = "SmallPinion_Layer2.003_Mesh"
    if old_mesh.users == 0:
        bpy.data.meshes.remove(old_mesh)

    pin.scale = (1.0, 1.0, 1.0)
    pin.rotation_euler = (0.0, 0.0, math.atan2(uy, ux))

    # Seat pinion mid-height on Layer 4 bottom tooth band
    deps = bpy.context.evaluated_depsgraph_get()
    eo = car.evaluated_get(deps)
    me = eo.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.transform(car.matrix_world)
    l4_zmin = min(v.co.z for v in bm.verts)
    eo.to_mesh_clear()
    bm.free()
    zc = l4_zmin + 0.5 * FACE
    pin.location = (cx + ux * CD_TARGET, cy + uy * CD_TARGET, zc)

    # Material
    if mat is not None:
        pin.data.materials.clear()
        pin.data.materials.append(mat)

    bpy.context.view_layer.update()

    # Confirm siblings untouched dims
    for n in ("SmallPinion_Layer2", "SmallPinion_Layer2.001", "SmallPinion_Layer2.002"):
        o = bpy.data.objects.get(n)
        if o:
            print(f"  sibling {n} dims={tuple(round(d,2) for d in o.dimensions)}")

    ok = verify(car, pin, CD_TARGET)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    print("Saved", BLEND)
    if not ok:
        raise SystemExit("Verification failed")


if __name__ == "__main__":
    main()
