import random
import sys

import pygame


WIDTH = 960
HEIGHT = 540
FPS = 60
GROUND_Y = HEIGHT - 110

PIX = 4
SPRITE_W = 16
SPRITE_H = 24

SKY_TOP = (118, 190, 255)
SKY_BOTTOM = (210, 236, 255)
GROUND_COLOR = (118, 192, 122)
SIDEWALK_COLOR = (173, 177, 186)
ROAD_COLOR = (78, 82, 104)

CITY_COLORS = [
    (255, 198, 190),
    (192, 214, 255),
    (252, 236, 170),
    (187, 244, 200),
]

VEHICLE_PALETTES = [
    {"body": (223, 93, 100), "roof": (245, 165, 172)},
    {"body": (94, 150, 236), "roof": (175, 205, 255)},
    {"body": (245, 183, 88), "roof": (255, 222, 146)},
    {"body": (108, 194, 132), "roof": (180, 231, 193)},
]
PUMPKIN_ORANGE = (250, 160, 94)
PUMPKIN_DARK = (216, 112, 65)
PUMPKIN_STEM = (96, 72, 46)
PUMPKIN_LEAF = (95, 182, 112)


CHARACTER_PALETTES = [
    {"name": "Sora", "skin": (255, 221, 204), "hair": (92, 64, 45), "outfit": (250, 116, 156), "trim": (255, 232, 241)},
    {"name": "Miko", "skin": (255, 229, 214), "hair": (54, 50, 88), "outfit": (122, 162, 255), "trim": (220, 232, 255)},
    {"name": "Kai", "skin": (232, 193, 168), "hair": (56, 45, 38), "outfit": (112, 205, 158), "trim": (211, 255, 232)},
    {"name": "Nori", "skin": (247, 213, 191), "hair": (132, 62, 44), "outfit": (255, 171, 92), "trim": (255, 230, 180)},
    {"name": "Aki", "skin": (255, 214, 180), "hair": (45, 45, 52), "outfit": (230, 118, 242), "trim": (248, 218, 255)},
    {"name": "Pip", "skin": (236, 199, 170), "hair": (181, 94, 137), "outfit": (95, 206, 218), "trim": (211, 250, 255)},
    {"name": "Rin", "skin": (255, 231, 208), "hair": (206, 129, 56), "outfit": (119, 216, 129), "trim": (212, 255, 217)},
    {"name": "Yumi", "skin": (228, 184, 152), "hair": (58, 73, 120), "outfit": (255, 130, 112), "trim": (255, 222, 214)},
]


class Chibi:
    def __init__(self, assets):
        self.assets = assets
        self.w = assets["run1"].get_width()
        self.h = assets["run1"].get_height()
        self.x = 130.0
        self.y = float(GROUND_Y - self.h)
        self.move_speed = 6.1
        self.vel_y = 0.0
        self.gravity = 0.75
        self.jump_strength = -16.2
        self.on_ground = True
        self.run_phase = 0.0

    @property
    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), self.w, self.h)

    def jump(self):
        if self.on_ground:
            self.vel_y = self.jump_strength
            self.on_ground = False

    def update(self, move_dir):
        self.x += move_dir * self.move_speed
        self.x = max(0, min(WIDTH - self.w, self.x))

        self.vel_y += self.gravity
        self.y += self.vel_y
        if self.y >= GROUND_Y - self.h:
            self.y = float(GROUND_Y - self.h)
            self.vel_y = 0.0
            self.on_ground = True

        self.run_phase += 0.25 + (abs(move_dir) * 0.12)

    def draw(self, surf):
        if not self.on_ground:
            frame = self.assets["jump"]
        else:
            frame = self.assets["run1"] if int(self.run_phase) % 2 == 0 else self.assets["run2"]
        surf.blit(frame, (int(self.x), int(self.y)))


class VehicleHazard:
    def __init__(self, x, speed):
        self.kind = random.choice(["car", "van"])
        if self.kind == "car":
            self.w = random.randint(56, 74)
            self.h = random.randint(30, 36)
        else:
            self.w = random.randint(70, 92)
            self.h = random.randint(34, 42)

        self.rect = pygame.Rect(x, GROUND_Y - self.h, self.w, self.h)
        self.speed = speed
        self.speed_variation = random.uniform(0.72, 1.35)
        self.palette = random.choice(VEHICLE_PALETTES)

    def update(self, speed_boost):
        travel_speed = (self.speed + speed_boost) * self.speed_variation
        self.rect.x -= max(2, int(travel_speed))

    def draw(self, surf):
        body = self.palette["body"]
        roof = self.palette["roof"]
        r = self.rect

        if self.kind == "car":
            pygame.draw.rect(surf, body, (r.x, r.y + 10, r.w, r.h - 10))
            pygame.draw.rect(surf, roof, (r.x + 12, r.y + 2, r.w - 24, 12))
            pygame.draw.rect(surf, (245, 248, 255), (r.x + 16, r.y + 5, r.w - 32, 7))
        else:
            pygame.draw.rect(surf, body, (r.x, r.y + 8, r.w, r.h - 8))
            pygame.draw.rect(surf, roof, (r.x + 8, r.y + 1, r.w - 18, 12))
            pygame.draw.rect(surf, (245, 248, 255), (r.x + 12, r.y + 4, r.w - 26, 7))

        pygame.draw.rect(surf, (45, 48, 60), (r.x + 10, r.bottom - 8, 12, 8))
        pygame.draw.rect(surf, (45, 48, 60), (r.right - 22, r.bottom - 8, 12, 8))
        pygame.draw.rect(surf, (18, 22, 34), (r.x + 13, r.bottom - 5, 6, 5))
        pygame.draw.rect(surf, (18, 22, 34), (r.right - 19, r.bottom - 5, 6, 5))
        pygame.draw.rect(surf, (255, 255, 255), r, 2)

    def offscreen(self):
        return self.rect.right < 0


class PumpkinHazard:
    def __init__(self, speed_scale, target_x):
        self.radius = random.randint(14, 22)
        self.x = float(target_x + random.randint(-90, 120))
        self.y = float(random.randint(-170, -50))
        self.vx = random.uniform(-1.0, 1.0)
        self.vy = random.uniform(4.2, 6.6) + (speed_scale * 0.05)

    @property
    def rect(self):
        size = self.radius * 2
        return pygame.Rect(int(self.x - self.radius), int(self.y - self.radius), size, size)

    def update(self):
        self.x += self.vx
        self.y += self.vy

    def draw(self, surf):
        cx = int(self.x)
        cy = int(self.y)
        r = self.radius

        pygame.draw.circle(surf, PUMPKIN_DARK, (cx, cy), r)
        pygame.draw.circle(surf, PUMPKIN_ORANGE, (cx - 2, cy - 2), r - 4)

        pygame.draw.line(surf, (236, 139, 82), (cx, cy - r + 4), (cx, cy + r - 4), 2)
        pygame.draw.line(surf, (236, 139, 82), (cx - r // 2, cy - r + 6), (cx - r // 2, cy + r - 6), 2)
        pygame.draw.line(surf, (236, 139, 82), (cx + r // 2, cy - r + 6), (cx + r // 2, cy + r - 6), 2)

        pygame.draw.rect(surf, PUMPKIN_STEM, (cx - 3, cy - r - 6, 6, 8))
        pygame.draw.polygon(surf, PUMPKIN_LEAF, [(cx + 4, cy - r - 2), (cx + 12, cy - r - 6), (cx + 9, cy - r + 1)])

        pygame.draw.rect(surf, (70, 52, 44), (cx - 6, cy - 3, 3, 3))
        pygame.draw.rect(surf, (70, 52, 44), (cx + 3, cy - 3, 3, 3))
        pygame.draw.line(surf, (86, 58, 58), (cx - 5, cy + 3), (cx + 5, cy + 3), 1)

    def offscreen(self):
        return self.y - self.radius > HEIGHT or self.x + self.radius < 0 or self.x - self.radius > WIDTH


class PitHazard:
    def __init__(self, x, speed):
        self.w = random.randint(64, 128)
        self.h = random.randint(34, 48)
        self.rect = pygame.Rect(x, GROUND_Y - 6, self.w, self.h)
        self.speed = speed
        self.speed_variation = random.uniform(0.75, 1.25)

    def update(self, speed_boost):
        travel_speed = (self.speed + speed_boost) * self.speed_variation
        self.rect.x -= max(2, int(travel_speed))

    def draw(self, surf):
        r = self.rect
        pygame.draw.rect(surf, (28, 31, 44), r)
        pygame.draw.rect(surf, (18, 20, 28), (r.x + 3, r.y + 3, r.w - 6, r.h - 6))

        stripe_y = r.y - 6
        for sx in range(r.x, r.right, 12):
            pygame.draw.rect(surf, (252, 206, 116), (sx, stripe_y, 6, 4))

    def offscreen(self):
        return self.rect.right < 0


def px(surface, x, y, w, h, color):
    surface.fill(color, pygame.Rect(x, y, w, h))


def scale_sprite(raw):
    return pygame.transform.scale(raw, (raw.get_width() * PIX, raw.get_height() * PIX))


def generate_chibi_assets(palette):
    hair = palette["hair"]
    skin = palette["skin"]
    outfit = palette["outfit"]
    trim = palette["trim"]
    leg = (58, 61, 84)

    def base_frame(leg_left, leg_right):
        s = pygame.Surface((SPRITE_W, SPRITE_H), pygame.SRCALPHA)

        px(s, 4, 1, 8, 3, hair)
        px(s, 5, 3, 6, 2, skin)

        px(s, 6, 3, 1, 1, (50, 50, 55))
        px(s, 9, 3, 1, 1, (50, 50, 55))
        px(s, 7, 4, 2, 1, (160, 84, 95))

        px(s, 4, 6, 8, 8, outfit)
        px(s, 5, 7, 6, 1, trim)

        px(s, 5, 14, 2, 3, leg)
        px(s, 9, 14, 2, 3, leg)

        px(s, 5, 17 + leg_left, 2, 5, leg)
        px(s, 9, 17 + leg_right, 2, 5, leg)

        px(s, 4, 13, 1, 2, skin)
        px(s, 11, 13, 1, 2, skin)

        return s

    run1 = scale_sprite(base_frame(0, 1))
    run2 = scale_sprite(base_frame(1, 0))

    jump = pygame.Surface((SPRITE_W, SPRITE_H), pygame.SRCALPHA)
    jump.blit(base_frame(0, 0), (0, 0))
    px(jump, 5, 18, 2, 4, (58, 61, 84))
    px(jump, 9, 18, 2, 4, (58, 61, 84))
    jump = scale_sprite(jump)

    icon = pygame.transform.scale(run1, (SPRITE_W * 3, SPRITE_H * 3))

    return {"run1": run1, "run2": run2, "jump": jump, "icon": icon, "name": palette["name"]}


def generate_city_layer(width, height):
    layer = pygame.Surface((width, height), pygame.SRCALPHA)
    block_width = 24
    base_y = GROUND_Y - 24

    for i in range(-1, width // block_width + 3):
        x = i * block_width
        h = 72 + ((i * 17) % 118)
        building = pygame.Rect(x, base_y - h, block_width - 2, h)
        color = CITY_COLORS[i % len(CITY_COLORS)]
        pygame.draw.rect(layer, color, building)

        for wy in range(building.y + 9, building.bottom - 8, 13):
            for wx in range(building.x + 4, building.right - 6, 10):
                if (wx + wy + i) % 4 != 0:
                    pygame.draw.rect(layer, (255, 255, 255), (wx, wy, 4, 6))

    return layer


def draw_gradient_bg(surf):
    for y in range(HEIGHT):
        t = y / HEIGHT
        r = int(SKY_TOP[0] * (1 - t) + SKY_BOTTOM[0] * t)
        g = int(SKY_TOP[1] * (1 - t) + SKY_BOTTOM[1] * t)
        b = int(SKY_TOP[2] * (1 - t) + SKY_BOTTOM[2] * t)
        pygame.draw.line(surf, (r, g, b), (0, y), (WIDTH, y))


def draw_city(surf, city_layer, scroll):
    x = -(scroll % city_layer.get_width())
    surf.blit(city_layer, (x, 0))
    surf.blit(city_layer, (x + city_layer.get_width(), 0))

    pygame.draw.rect(surf, GROUND_COLOR, (0, GROUND_Y - 12, WIDTH, 24))
    pygame.draw.rect(surf, SIDEWALK_COLOR, (0, GROUND_Y + 12, WIDTH, 20))
    pygame.draw.rect(surf, ROAD_COLOR, (0, GROUND_Y + 32, WIDTH, HEIGHT - GROUND_Y))

    for x in range(0, WIDTH + 70, 70):
        dash_x = (x - (scroll * 2) % 70)
        pygame.draw.rect(surf, (238, 238, 252), (dash_x, GROUND_Y + 52, 35, 6))


def draw_text(surf, text, size, color, x, y):
    font = pygame.font.SysFont("consolas", size, bold=True)
    surf.blit(font.render(text, True, color), (x, y))


def draw_menu(screen, assets_list, selected):
    draw_gradient_bg(screen)
    draw_text(screen, "CHIBI CITY DASH", 56, (54, 70, 110), 225, 42)
    draw_text(screen, "Choose your 8-bit runner", 28, (74, 86, 126), 305, 100)

    start_x = 120
    start_y = 165
    card_w = 180
    card_h = 150
    cols = 4

    for idx, assets in enumerate(assets_list):
        row = idx // cols
        col = idx % cols
        x = start_x + col * (card_w + 20)
        y = start_y + row * (card_h + 24)

        border = (255, 255, 255)
        bg = (245, 250, 255)
        if idx == selected:
            border = (255, 193, 118)
            bg = (255, 243, 223)

        pygame.draw.rect(screen, bg, (x, y, card_w, card_h))
        pygame.draw.rect(screen, border, (x, y, card_w, card_h), 4)

        icon = assets["icon"]
        screen.blit(icon, (x + (card_w - icon.get_width()) // 2, y + 18))
        draw_text(screen, f"{idx + 1}. {assets['name']}", 20, (58, 66, 88), x + 36, y + 108)

    draw_text(screen, "Use Arrow Keys or A/D to choose", 24, (66, 75, 105), 292, 486)
    draw_text(screen, "Press ENTER or SPACE to start", 24, (66, 75, 105), 292, 514)


def reset_game(selected_assets):
    return {
        "chibi": Chibi(selected_assets),
        "vehicles": [],
        "pumpkins": [],
        "pits": [],
        "spawn_timer": 0,
        "pumpkin_timer": 80,
        "pit_timer": 120,
        "score": 0.0,
        "city_scroll": 0,
        "game_speed": 6.0,
        "game_over": False,
        "death_reason": "",
    }


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Chibi City Dash")
    clock = pygame.time.Clock()

    assets_list = [generate_chibi_assets(palette) for palette in CHARACTER_PALETTES]
    city_layer = generate_city_layer(WIDTH, HEIGHT)

    game_state = "menu"
    selected_idx = 0
    world = reset_game(assets_list[selected_idx])

    while True:
        dt = clock.tick(FPS) / 16.67

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.KEYDOWN:
                if game_state == "menu":
                    if event.key in (pygame.K_RIGHT, pygame.K_d):
                        selected_idx = (selected_idx + 1) % len(assets_list)
                    elif event.key in (pygame.K_LEFT, pygame.K_a):
                        selected_idx = (selected_idx - 1) % len(assets_list)
                    elif event.key == pygame.K_UP:
                        selected_idx = (selected_idx - 4) % len(assets_list)
                    elif event.key == pygame.K_DOWN:
                        selected_idx = (selected_idx + 4) % len(assets_list)
                    elif event.key in (pygame.K_RETURN, pygame.K_SPACE):
                        world = reset_game(assets_list[selected_idx])
                        game_state = "play"

                elif game_state == "play":
                    if event.key in (pygame.K_SPACE, pygame.K_UP, pygame.K_w):
                        if world["game_over"]:
                            world = reset_game(assets_list[selected_idx])
                        else:
                            world["chibi"].jump()
                    elif world["game_over"] and event.key == pygame.K_ESCAPE:
                        game_state = "menu"

        if game_state == "menu":
            draw_menu(screen, assets_list, selected_idx)
            pygame.display.flip()
            continue

        if not world["game_over"]:
            keys = pygame.key.get_pressed()
            move_dir = 0
            if keys[pygame.K_LEFT] or keys[pygame.K_a]:
                move_dir -= 1
            if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
                move_dir += 1

            world["chibi"].update(move_dir)
            world["city_scroll"] += int(world["game_speed"])
            world["score"] += 0.09 * dt
            world["game_speed"] = min(14.5, 6.0 + world["score"] / 30.0)

            world["spawn_timer"] -= 1 * dt
            if world["spawn_timer"] <= 0:
                world["vehicles"].append(
                    VehicleHazard(WIDTH + random.randint(0, 120), world["game_speed"])
                )
                world["spawn_timer"] = random.randint(45, 88)

            world["pumpkin_timer"] -= 1 * dt
            if world["pumpkin_timer"] <= 0:
                world["pumpkins"].append(PumpkinHazard(world["game_speed"], world["chibi"].rect.centerx))
                world["pumpkin_timer"] = random.randint(58, 112)

            world["pit_timer"] -= 1 * dt
            if world["pit_timer"] <= 0:
                world["pits"].append(PitHazard(WIDTH + random.randint(0, 120), world["game_speed"]))
                world["pit_timer"] = random.randint(95, 165)

            chibi_rect = world["chibi"].rect
            for vehicle in world["vehicles"]:
                vehicle.update(world["game_speed"] * 0.18)
                if chibi_rect.colliderect(vehicle.rect.inflate(-6, -8)):
                    world["game_over"] = True
                    world["death_reason"] = "hit"

            for pumpkin in world["pumpkins"]:
                pumpkin.update()
                if chibi_rect.colliderect(pumpkin.rect.inflate(-8, -8)):
                    world["game_over"] = True
                    world["death_reason"] = "hit"

            chibi_feet_x = chibi_rect.centerx
            for pit in world["pits"]:
                pit.update(world["game_speed"] * 0.12)
                if (
                    world["chibi"].on_ground
                    and pit.rect.left + 8 <= chibi_feet_x <= pit.rect.right - 8
                ):
                    world["game_over"] = True
                    world["death_reason"] = "pit"
                    world["chibi"].on_ground = False
                    world["chibi"].vel_y = 6.5

            world["vehicles"] = [v for v in world["vehicles"] if not v.offscreen()]
            world["pumpkins"] = [p for p in world["pumpkins"] if not p.offscreen()]
            world["pits"] = [p for p in world["pits"] if not p.offscreen()]
        elif world["death_reason"] == "pit":
            world["chibi"].y = min(float(HEIGHT + 120), world["chibi"].y + 7.5)

        draw_gradient_bg(screen)
        draw_city(screen, city_layer, world["city_scroll"])
        for pit in world["pits"]:
            pit.draw(screen)
        world["chibi"].draw(screen)

        for vehicle in world["vehicles"]:
            vehicle.draw(screen)
        for pumpkin in world["pumpkins"]:
            pumpkin.draw(screen)

        draw_text(screen, f"Score: {int(world['score'])}", 28, (35, 55, 70), 20, 18)
        draw_text(screen, f"Runner: {assets_list[selected_idx]['name']}", 23, (70, 82, 112), 20, 48)
        draw_text(screen, "Move: A/D or LEFT/RIGHT", 20, (76, 89, 121), WIDTH - 300, 18)
        draw_text(screen, "Jump: SPACE / W / UP", 20, (76, 89, 121), WIDTH - 300, 44)

        if world["game_over"]:
            overlay = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
            overlay.fill((255, 255, 255, 120))
            screen.blit(overlay, (0, 0))
            if world["death_reason"] == "pit":
                draw_text(screen, "WHOOPS! You fell in a pit.", 40, (100, 66, 96), 210, 190)
            else:
                draw_text(screen, "BONK! You got tagged.", 42, (100, 66, 96), 258, 190)
            draw_text(screen, "SPACE to retry", 32, (74, 70, 102), 360, 252)
            draw_text(screen, "ESC for menu", 32, (74, 70, 102), 370, 292)

        pygame.display.flip()


if __name__ == "__main__":
    main()
