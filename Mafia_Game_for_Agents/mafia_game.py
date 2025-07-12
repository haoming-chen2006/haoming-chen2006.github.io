import asyncio
import re
from collections import defaultdict
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

# Model setup
model_client = OpenAIChatCompletionClient(model="gpt-4o")

# General game rules
GAME_RULES = """
You are playing the social deduction game Mafia with 6 total players, identified as Player 1 to Player 6. Player 6 is the referee so don't include them in the gameplay.
Roles include: 1 Killer, 1 Detective, and 3 Peasants. One Referee manages the game and does not participate in the conversation.

The game alternates between Day and Night phases.
During the **Day Phase**, all players:
1. Internally think about the current situation and decide what to say.
2. Output a public 'speech' visible to other players.
After all players have spoken, each one:
- Thinks about who seems suspicious based on the speeches.
- Publicly casts a vote: "I vote Player X".
The player with the most votes is eliminated.

You must stay in character and NEVER reveal your secret role unless it's a strategic move, you can also lie about your role. The killer wins by eliminating everyone. The villagers (Detective + Peasants) win by eliminating the killer through voting.
"""

# Memory storage per agent
agent_memories = defaultdict(str)
referee_memory = {
    "roles": {
        "Player_1": "killer",
        "Player_2": "detective",
        "Player_3": "peasant",
        "Player_4": "peasant",
        "Player_5": "peasant",
    },
    "rounds": []
}

round_counter = {
    "night": 0,
    "day": 0
}

# Agents setup (fixed roles for now)
agents = [
    AssistantAgent("Player_1", model_client, system_message=GAME_RULES + "\nYou are the killer."),
    AssistantAgent("Player_2", model_client, system_message=GAME_RULES + "\nYou are the detective."),
    AssistantAgent("Player_3", model_client, system_message=GAME_RULES + "\nYou are a peasant."),
    AssistantAgent("Player_4", model_client, system_message=GAME_RULES + "\nYou are a peasant."),
    AssistantAgent("Player_5", model_client, system_message=GAME_RULES + "\nYou are a peasant."),
    AssistantAgent("Player_6", model_client, system_message="You are the neutral referee."),
]

live_players = agents[:5]  # Players only, excluding referee

async def run_night_phase():
    global live_players
    killer = agents[0]
    detective = agents[1]
    referee = agents[5]

    transcript = ["===== NIGHT PHASE =====\n"]
    round_info = f"\n===== ROUND INFO =====\nNight {round_counter['night'] + 1} starting (days passed: {round_counter['day']}, nights passed: {round_counter['night']})\n"
    round_counter["night"] += 1
    # Killer chooses target
    killer_prompt = (
        f"You are the killer. Choose someone to eliminate from: {[a.name for a in live_players if a.name != 'Player_1']}.\n"
        f"Provide internal reasoning and a final decision clearly."
    )
    kill_response = await killer.run(task=killer_prompt + round_info)
    killer_text = kill_response.messages[-1].content.strip()
    print(killer_text)
    transcript.append(f"Killer (Player_1) decision:\n{killer_text}\n")

    # Referee interprets
    referee_prompt = (
        f"Interpret the killer's response:\n\n{killer_text}\n\n"
        f"Select a player to be killed from {[a.name for a in live_players if a.name != 'Player_1']}.\n"
        "Respond strictly: **killed** Player_X"
    )
    referee_response = await referee.run(task=referee_prompt)
    referee_text = referee_response.messages[-1].content.strip()
    print(referee_text)
    transcript.append(f"Referee decision:\n{referee_text}\n")

    killed_match = re.search(r"\*\*killed\*\*\s*(Player_\d+)", referee_text)
    killed_player = killed_match.group(1) if killed_match else None

    # Detective investigates
    alive_detect_targets = [a.name for a in live_players if a.name != "Player_2"]
    detective_prompt = (
        f"Choose one player to investigate tonight from {alive_detect_targets}. "
        "Respond: **investigate: Player_X**"
    )
    investigate_response = await detective.run(task=detective_prompt + round_info)
    investigation_text = investigate_response.messages[-1].content.strip()
    print(investigate_response)
    transcript.append(f"Detective (Player_2) decision:\n{investigation_text}\n")

    investigated_match = re.search(r"\*\*investigate:\s*(Player_\d+)\*\*", investigation_text)
    investigated_player = investigated_match.group(1) if investigated_match else None

    # Record result for detective
    if investigated_player:
        role = "killer" if investigated_player == "Player_1" else "not the killer"
        agent_memories["Player_2"] += f"\nInvestigation result: {investigated_player} is {role}.\n"
        transcript.append(f"Referee reveals to Detective: {investigated_player} is {role}\n")
    else:
        feedback = "\nInvestigation failed: No valid player was investigated.\n"
    agent_memories["Player_2"] += "you finished your investigation, now use that for the vote next day"

    # Update game state
    if killed_player:
        live_players = [a for a in live_players if a.name != killed_player]
        announcement = f"The referee announces: {killed_player} was found dead this morning."
        for agent in live_players:
            agent_memories[agent.name] += f"\n{announcement}\n"
        transcript.append(f"\n>>> {announcement}\n")
        referee_memory["rounds"].append({"killed": killed_player})

    # Save night transcript
    with open("game_play.txt", "a") as f:
        f.write("".join(transcript))
    with open("all.txt", "a") as f:
        f.write("".join(transcript))
    print({"killed": killed_player, "investigated": investigated_player})
    with open("memory.txt", "a") as f:
        f.write(f"\n===== NIGHT {round_counter['night']} - PLAYER MEMORIES =====\n")
        for agent in live_players:
            f.write(f"\n{agent.name}'s memory:\n{agent_memories[agent.name]}\n")


    return {"killed": killed_player, "investigated": investigated_player}
async def run_day_phase():
    global live_players
    discussion_lines = []
    discussion_context = ""
    full_transcript = []
    round_info = f"\n===== ROUND INFO =====\nDay {round_counter['day'] + 1} starting (days passed: {round_counter['day']}, nights passed: {round_counter['night']})\n"
    round_counter["day"] += 1
    for agent in live_players:
        memory = agent_memories[agent.name]
        prompt = (
            f"You are currently in the discussion phase.\n"
            f"Here is your memory of previous discussions and eliminations:\n{memory}\n\n"
            "First, generate an internal thinking process about the current situation, including what happened last night."
            " Pay attention to suspicion/support toward you or others.\n"
            "Then, provide a speech visible to other agents.\n"
            f"Here is the current discussion so far, if its empty you are the first, take your role  (remember what player are you and what role):\n{discussion_context}\n"
            "Mark the start of your speech (visible to others) with **public speech**.\n"
        )
        response = await agent.run(task=prompt)
        full_text = response.messages[-1].content.strip()
        full_transcript.append(f"{agent.name}: {full_text}\n")

        if "public speech" in full_text.lower():
            speech = full_text.lower().split("public speech", 1)[-1].strip()
        else:
            speech = "(No public speech found)"
        print(f"{agent.name} (speech): {speech}\n")
        agent_memories[agent.name] += "this is my thinking process and my speech in the previous round" + full_text
        entry = f"{agent.name}: {speech}"
        discussion_lines.append(entry)
        discussion_context += entry + "\n"
        print(f"Discussion context updated: {discussion_context}\n")

    formatted_discussion = "\n".join(discussion_lines)
    full_transcript.append("\n===== FORMATTED DISCUSSION =====\n" + formatted_discussion + "\n")

    individual_votes = []

    for agent in live_players:
        memory = agent_memories[agent.name]
        vote_prompt = (
            f"You are {agent.name}. Here is your memory of prior events:\n{memory}\n\n"
            f"Based on this discussion:\n{discussion_context}\n\n"
            "Generate internal reasoning about each player's identity based on the discussion."
            " Then vote. End with: 'I vote Player_X'."
        )
        vote_response = await agent.run(task=vote_prompt)
        vote_text = vote_response.messages[-1].content.strip()
        full_transcript.append(f"{agent.name} vote: {vote_text}\n")
        individual_votes.append(f"{agent.name} vote: {vote_text}")
        agent_memories[agent.name] += f"\nPrevious vote: {vote_text}\n"

    referee = agents[5]
    stacked_votes = "\n".join(individual_votes)

    referee_prompt = (
        f"You are the referee. Here are the votes from all players:\n\n{stacked_votes}\n\n"
        "Determine who is eliminated. End your response with '**eliminated: Player_X**'."
    )
    referee_response = await referee.run(task=referee_prompt)
    referee_text = referee_response.messages[-1].content.strip()
    full_transcript.append("\n===== REFEREE DECISION =====\n" + referee_text + "\n")

    for agent in live_players:
        agent_memories[agent.name] += f"\nReferee decision: {referee_text}\n"

    match = re.search(r"\*\*eliminated:\s*(Player_\d+)\*\*", referee_text, re.IGNORECASE)
    eliminated_player = match.group(1) if match else None        

    if eliminated_player:
        live_players = [a for a in live_players if a.name != eliminated_player]
        referee_memory["rounds"][-1]["eliminated"] = eliminated_player
        for agent in live_players:
            agent_memories[agent.name] += f"Eliminated player from voting: {eliminated_player}\n"

    with open("game_play.txt", "a") as f:
        f.write("===== FORMATTED DISCUSSION =====\n" + formatted_discussion + "\n")
        f.write("===== REFEREE DECISION =====\n" + referee_text + "\n")

    with open("all.txt", "a") as f:
        f.write(stacked_votes + "\n")

    with open("all.txt", "a") as f:
        f.write("\n".join(full_transcript))
    with open("memory.txt", "a") as f:
        f.write(f"\n===== DAY {round_counter['day']} - PLAYER MEMORIES =====\n")
        for agent in live_players:
            f.write(f"\n{agent.name}'s memory:\n{agent_memories[agent.name]}\n")

        f.write(f"\n===== DAY {round_counter['day']} - INTERNAL THINKING =====\n")
        for agent_text in full_transcript:
            if "**public speech**" in agent_text:
                internal = agent_text.split("**public speech**")[0]
                f.write(internal + "\n")
async def run_round():
    print("\n🌙 NIGHT PHASE")
    night_results = await run_night_phase()

    print("\n🌞 DAY PHASE")

    # 1. Update each agent prompt with role + player index (only if still alive)
    role_map = {
        "Player_1": "killer",
        "Player_2": "detective",
        "Player_3": "peasant",
        "Player_4": "peasant",
        "Player_5": "peasant"
    }

    for agent in live_players:
        identity_line = f"You are {agent.name}, and your role is a {role_map[agent.name]}.\n"
        memory = agent_memories[agent.name]
        # Simple memory truncation (only last 1000 characters)
        memory = memory[-1000:] if len(memory) > 1000 else memory
        agent_memories[agent.name] = memory
        agent_memories[agent.name] = identity_line + agent_memories[agent.name]
    await run_day_phase()
    remaining_roles = [referee_memory["roles"][a.name] for a in live_players]
    if "killer" not in remaining_roles:
        game_end_msg = "🎉 Game Over: The villagers win! The killer has been eliminated."
    else:
        game_end_msg = "🔄 Game continues: The killer is still in the game."
        print("game keeps going")

    with open("game_play.txt", "a") as f:
        f.write(game_end_msg + "\n")
    with open("all.txt", "a") as f:
        f.write(game_end_msg + "\n")
        print(game_end_msg)

async def run_game():
    while True:
        await run_round()

        # Truncate memory to last 1000 characters
        for agent in live_players:
            mem = agent_memories[agent.name]
            agent_memories[agent.name] = mem[-1000:] if len(mem) > 1000 else mem

        # Re-append round info + identity for context
        for agent in live_players:
            identity_line = f"You are {agent.name}, and your role is a {referee_memory['roles'][agent.name]}.\n"
            agent_memories[agent.name] = identity_line + agent_memories[agent.name]

        # Check if game ends
        remaining_roles = [referee_memory["roles"][a.name] for a in live_players]
        if "killer" not in remaining_roles:
            game_end_msg = "🎉 Game Over: The villagers win! The killer has been eliminated."
            break
        elif len(remaining_roles) <= 2:
            game_end_msg = "💀 Game Over: The killer wins! Villagers are outnumbered."
            break
        else:
            with open("game_play.txt", "a") as f:
                f.write("🔄 Game continues: The killer is still in the game.\n")
                print("game keeps going")
    with open("game_play.txt", "a") as f:
        f.write(game_end_msg + "\n")
    with open("memory.txt", "a") as f:
        f.write("\n=== FINAL RESULT ===\n" + game_end_msg + "\n")
    print(game_end_msg)

if __name__ == "__main__":
    asyncio.run(run_game())